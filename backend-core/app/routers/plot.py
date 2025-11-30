import io
import base64
import matplotlib.pyplot as plt
from fastapi import APIRouter, HTTPException

from kika.plotting.plot_builder import PlotBuilder

from ..models import (
    MatplotlibExportRequest, MatplotlibExportResponse,
    ENDFMatplotlibExportRequest
)
from ..services.ace_service import load_ace_object
from ..services.endf_service import load_endf_object
from ..services.plot_service import convert_plotly_linestyle, convert_plotly_marker

router = APIRouter(prefix="/api/plot", tags=["plot"])

@router.post("/matplotlib-export", response_model=MatplotlibExportResponse)
async def export_with_matplotlib(request: MatplotlibExportRequest):
    """
    Generate high-quality plot using Matplotlib PlotBuilder with full customization.
    This endpoint is designed for final exports (publications, presentations).
    """
    try:
        fig_settings = request.figure_settings
        
        # Support both figWidthInches/figHeightInches (from frontend) and width/height (legacy)
        if 'figWidthInches' in fig_settings:
            fig_width = fig_settings.get('figWidthInches', 8)
            fig_height = fig_settings.get('figHeightInches', 5)
        else:
            fig_width = fig_settings.get('width', 900) / 100  # Convert px to inches (assuming 100 dpi)
            fig_height = fig_settings.get('height', 580) / 100
        
        # Create PlotBuilder with style
        builder = PlotBuilder(
            style=request.style,
            figsize=(fig_width, fig_height),
            dpi=request.dpi
        )
        
        # Process each series
        for series_config in request.series:
            file_id = series_config.get('fileId')
            file_name = series_config.get('fileName', 'unknown')
            mt_number = series_config.get('mtNumber')
            plot_type = series_config.get('plotType', 'xs')
            
            if not file_id or mt_number is None:
                continue
                
            # Load ACE object
            _, ace_obj, _ = load_ace_object(
                file_id=file_id,
                file_content=None,
                file_name=file_name
            )
            
            # Generate plot data
            if plot_type == 'xs':
                plot_data = ace_obj.to_plot_data('xs', mt=mt_number)
            else:  # angular
                energy = series_config.get('energy', 1.0)
                plot_data = ace_obj.to_plot_data('angular', mt=mt_number, energy=energy)
            
            # Apply series styling
            plot_data.color = series_config.get('color', None)
            plot_data.linewidth = series_config.get('lineWidth', 2.0)
            plot_data.linestyle = convert_plotly_linestyle(series_config.get('lineStyle', 'solid'))
            
            # Handle markers
            if series_config.get('showMarkers', False):
                plot_data.marker = convert_plotly_marker(series_config.get('markerSymbol', 'circle'))
                plot_data.markersize = series_config.get('markerSize', 6)
            
            # Override label if custom
            if series_config.get('labelMode') == 'custom' and series_config.get('customLabel'):
                plot_data.label = series_config['customLabel']
            
            builder.add_data(plot_data)
        
        # Configure plot
        builder.set_labels(
            title=fig_settings.get('title', ''),
            x_label=fig_settings.get('xLabel', ''),
            y_label=fig_settings.get('yLabel', '')
        )
        
        builder.set_scales(
            log_x=fig_settings.get('logX', False),
            log_y=fig_settings.get('logY', False)
        )
        
        # Set axis limits if specified
        x_min = fig_settings.get('xMin')
        x_max = fig_settings.get('xMax')
        y_min = fig_settings.get('yMin')
        y_max = fig_settings.get('yMax')
        
        x_lim = None
        y_lim = None
        
        if x_min or x_max:
            try:
                x_min_val = float(x_min) if x_min else None
                x_max_val = float(x_max) if x_max else None
                if x_min_val is not None or x_max_val is not None:
                    x_lim = (x_min_val, x_max_val)
            except (ValueError, TypeError):
                pass
        
        if y_min or y_max:
            try:
                y_min_val = float(y_min) if y_min else None
                y_max_val = float(y_max) if y_max else None
                if y_min_val is not None or y_max_val is not None:
                    y_lim = (y_min_val, y_max_val)
            except (ValueError, TypeError):
                pass
        
        if x_lim is not None or y_lim is not None:
            builder.set_limits(x_lim=x_lim, y_lim=y_lim)
        
        # Grid and legend
        if fig_settings.get('showGrid', True):
            grid_alpha = fig_settings.get('gridAlpha', 0.3)
            show_minor = fig_settings.get('showMinorGrid', False)
            minor_alpha = fig_settings.get('minorGridAlpha', 0.15)
            builder.set_grid(grid=True, alpha=grid_alpha, show_minor=show_minor, minor_alpha=minor_alpha)
        else:
            builder.set_grid(grid=False)
        
        if fig_settings.get('showLegend', True):
            # Convert Plotly legend position to matplotlib
            legend_pos = fig_settings.get('legendPosition', 'top-right')
            mpl_legend_pos = {
                'top-right': 'upper right',
                'top-left': 'upper left',
                'bottom-right': 'lower right',
                'bottom-left': 'lower left',
                'outside': 'upper left'  # Outside position - we'll adjust in build
            }.get(legend_pos, 'best')
            builder.set_legend(loc=mpl_legend_pos)
        
        # Build the figure
        fig = builder.build()
        
        # Export to specified format
        buf = io.BytesIO()
        fig.savefig(buf, format=request.export_format, dpi=request.dpi, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        # Calculate actual dimensions
        width_px = int(fig_width * request.dpi)
        height_px = int(fig_height * request.dpi)
        
        return MatplotlibExportResponse(
            image_base64=image_base64,
            format=request.export_format,
            width_px=width_px,
            height_px=height_px,
            dpi=request.dpi
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating matplotlib export: {str(e)}")

@router.post("/endf/matplotlib-export", response_model=MatplotlibExportResponse)
async def export_endf_with_matplotlib(request: ENDFMatplotlibExportRequest):
    """
    Generate high-quality ENDF plot using Matplotlib with full customization.
    """
    if not request.series:
        raise HTTPException(status_code=400, detail="No series provided for export")

    try:
        fig_settings = request.figure_settings
        # Support both figWidthInches/figHeightInches (from frontend) and width/height (legacy)
        if 'figWidthInches' in fig_settings:
            fig_width = fig_settings.get('figWidthInches', 8)
            fig_height = fig_settings.get('figHeightInches', 5)
        else:
            fig_width = fig_settings.get('width', 900) / 100
            fig_height = fig_settings.get('height', 580) / 100

        builder = PlotBuilder(
            style=request.style,
            figsize=(fig_width, fig_height),
            dpi=request.dpi
        )

        for idx, series_config in enumerate(request.series):
            if not series_config.file_id and not series_config.file_content:
                raise HTTPException(status_code=400, detail=f"Series {idx+1} missing file_id and file_content")

            _, endf_obj, _ = load_endf_object(
                file_id=series_config.file_id,
                file_content=series_config.file_content,
                file_name=series_config.file_name,
            )

            data_type = series_config.data_type.lower()
            sigma = series_config.sigma if series_config.sigma and series_config.sigma > 0 else 1.0

            if data_type == 'angular':
                result = endf_obj.to_plot_data(
                    mf=4,
                    mt=series_config.mt_number,
                    order=series_config.order,
                    uncertainty=series_config.include_uncertainty,
                    sigma=sigma,
                )
                if isinstance(result, tuple):
                    plot_data, unc_band = result
                else:
                    plot_data = result
                    unc_band = None
            elif data_type == 'uncertainty':
                plot_data = endf_obj.to_plot_data(
                    mf=34,
                    mt=series_config.mt_number,
                    order=series_config.order,
                )
                unc_band = None
            else:
                raise HTTPException(status_code=400, detail=f"Invalid data_type '{series_config.data_type}' in series {idx+1}")

            # Styling
            if series_config.labelMode == 'custom' and series_config.customLabel:
                plot_data.label = series_config.customLabel

            if series_config.color:
                plot_data.color = series_config.color
            if series_config.lineWidth is not None:
                plot_data.linewidth = series_config.lineWidth
            if series_config.lineStyle:
                plot_data.linestyle = convert_plotly_linestyle(series_config.lineStyle)

            if series_config.showMarkers and series_config.markerSymbol:
                plot_data.marker = convert_plotly_marker(series_config.markerSymbol)
                if series_config.markerSize is not None:
                    plot_data.markersize = series_config.markerSize
            else:
                plot_data.marker = None

            if unc_band and not series_config.include_uncertainty:
                unc_band = None

            if unc_band:
                builder.add_data(plot_data, uncertainty=unc_band)
            else:
                builder.add_data(plot_data)

        # Configure figure settings (same as ACE export)
        builder.set_labels(
            title=fig_settings.get('title', ''),
            x_label=fig_settings.get('xLabel', ''),
            y_label=fig_settings.get('yLabel', '')
        )

        builder.set_scales(
            log_x=fig_settings.get('logX', False),
            log_y=fig_settings.get('logY', False)
        )

        x_lim = None
        y_lim = None

        x_min = fig_settings.get('xMin')
        x_max = fig_settings.get('xMax')
        y_min = fig_settings.get('yMin')
        y_max = fig_settings.get('yMax')

        if x_min or x_max:
            try:
                x_min_val = float(x_min) if x_min else None
                x_max_val = float(x_max) if x_max else None
                if x_min_val is not None or x_max_val is not None:
                    x_lim = (x_min_val, x_max_val)
            except (ValueError, TypeError):
                pass

        if y_min or y_max:
            try:
                y_min_val = float(y_min) if y_min else None
                y_max_val = float(y_max) if y_max else None
                if y_min_val is not None or y_max_val is not None:
                    y_lim = (y_min_val, y_max_val)
            except (ValueError, TypeError):
                pass

        if x_lim is not None or y_lim is not None:
            builder.set_limits(x_lim=x_lim, y_lim=y_lim)

        if fig_settings.get('showGrid', True):
            grid_alpha = fig_settings.get('gridAlpha', 0.3)
            show_minor = fig_settings.get('showMinorGrid', False)
            minor_alpha = fig_settings.get('minorGridAlpha', 0.15)
            builder.set_grid(grid=True, alpha=grid_alpha, show_minor=show_minor, minor_alpha=minor_alpha)
        else:
            builder.set_grid(grid=False)

        if fig_settings.get('showLegend', True):
            legend_pos = fig_settings.get('legendPosition', 'top-right')
            mpl_legend_pos = {
                'top-right': 'upper right',
                'top-left': 'upper left',
                'bottom-right': 'lower right',
                'bottom-left': 'lower left',
                'outside': 'upper left',
            }.get(legend_pos, 'best')
            builder.set_legend(loc=mpl_legend_pos)

        fig = builder.build()

        buf = io.BytesIO()
        fig.savefig(buf, format=request.export_format, dpi=request.dpi, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)

        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        width_px = int(fig_width * request.dpi)
        height_px = int(fig_height * request.dpi)

        return MatplotlibExportResponse(
            image_base64=image_base64,
            format=request.export_format,
            width_px=width_px,
            height_px=height_px,
            dpi=request.dpi
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating ENDF matplotlib export: {str(e)}")
