import uuid
import numpy as np
from fastapi import APIRouter, HTTPException

from ..models import (
    ENDFParseRequest, ENDFInfoResponse, ENDFSeriesRequest, ENDFSeriesResponse,
    ENDFUncertaintyPayload
)
from ..services.endf_service import load_endf_object, extract_endf_metadata, update_endf_cache_filename

router = APIRouter(prefix="/api/endf", tags=["endf"])

@router.post("/parse", response_model=ENDFInfoResponse)
async def parse_endf_file(request: ENDFParseRequest):
    """
    Parse ENDF file and return metadata needed by the frontend
    """
    try:
        file_id, endf_obj, info = load_endf_object(
            file_id=None,
            file_content=request.file_content,
            file_name=request.file_name,
        )
        update_endf_cache_filename(file_id, request.file_name)
        return ENDFInfoResponse(
            file_id=file_id,
            **info,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing ENDF file: {str(e)}")

@router.post("/series", response_model=ENDFSeriesResponse)
async def get_endf_series(request: ENDFSeriesRequest):
    """
    Return ENDF Legendre/uncertainty data for interactive plotting
    """
    try:
        file_id, endf_obj, info = load_endf_object(
            file_id=request.file_id,
            file_content=request.file_content,
            file_name=request.file_name,
        )
        data_type = request.data_type.lower()
        if data_type not in ('angular', 'uncertainty'):
            raise HTTPException(status_code=400, detail="data_type must be 'angular' or 'uncertainty'")

        sigma = request.sigma if request.sigma and request.sigma > 0 else 1.0
        include_unc = bool(request.include_uncertainty)

        if data_type == 'angular':
            result = endf_obj.to_plot_data(
                mf=4,
                mt=request.mt_number,
                order=request.order,
                uncertainty=include_unc,
                sigma=sigma,
            )
            if isinstance(result, tuple):
                plot_data, unc_band = result
            else:
                plot_data = result
                unc_band = None
            x_unit = "Energy (eV)"
            y_unit = "Legendre Coefficient"
        else:
            plot_data = endf_obj.to_plot_data(
                mf=34,
                mt=request.mt_number,
                order=request.order,
            )
            unc_band = None
            x_unit = "Energy (eV)"
            y_unit = "Relative Uncertainty"

        label = plot_data.label or f"{info.get('isotope', 'ENDF')} MT{request.mt_number} L={request.order}"
        plot_style = getattr(plot_data, 'plot_type', 'line') or 'line'
        line_shape = 'hv' if plot_style == 'step' else None

        uncertainty_payload = None
        if unc_band:
            try:
                # Handle LegendreUncertaintyPlotData which has x, y attributes (uncertainty on sparse grid)
                # Check if it's the new style object (has x, y, uncertainty_type)
                if hasattr(unc_band, 'uncertainty_type') and hasattr(unc_band, 'x') and hasattr(unc_band, 'y'):
                    from scipy.interpolate import interp1d
                    
                    # Interpolate uncertainty to match nominal data energy grid
                    # Use 'previous' (step) interpolation to match the native step plot behavior
                    interp_func = interp1d(
                        unc_band.x, 
                        unc_band.y, 
                        kind='previous', 
                        bounds_error=False, 
                        fill_value=(unc_band.y[0], unc_band.y[-1])
                    )
                    unc_interp = interp_func(plot_data.x)
                    
                    # Convert from relative (%) to absolute bounds
                    y_arr = np.array(plot_data.y)
                    if unc_band.uncertainty_type == 'relative':
                        unc_relative = np.array(unc_interp) / 100.0  # Convert % to fraction
                        lower_arr = y_arr - y_arr * unc_relative
                        upper_arr = y_arr + y_arr * unc_relative
                    else:
                        # Absolute uncertainty (rare case)
                        lower_arr = y_arr - unc_interp
                        upper_arr = y_arr + unc_interp
                        
                # Old style with y_lower/y_upper attributes (backwards compatibility)
                elif hasattr(unc_band, 'y_lower') and hasattr(unc_band, 'y_upper'):
                    is_relative = False
                    if hasattr(unc_band, 'is_relative') and callable(unc_band.is_relative):
                        is_relative = unc_band.is_relative()
                    elif hasattr(unc_band, '_is_relative'):
                        is_relative = unc_band._is_relative
                    
                    if is_relative:
                        y_arr = np.array(plot_data.y)
                        lower_arr = y_arr - y_arr * np.array(unc_band.y_lower)
                        upper_arr = y_arr + y_arr * np.array(unc_band.y_upper)
                    else:
                        lower_arr = unc_band.y_lower
                        upper_arr = unc_band.y_upper
                else:
                    raise ValueError(f"Uncertainty band object has unexpected structure. Type: {type(unc_band)}, Attributes: {dir(unc_band)}")
                
                if lower_arr is not None and upper_arr is not None:
                    lower_list = lower_arr.tolist() if hasattr(lower_arr, 'tolist') else list(lower_arr)
                    upper_list = upper_arr.tolist() if hasattr(upper_arr, 'tolist') else list(upper_arr)
                    uncertainty_payload = ENDFUncertaintyPayload(
                        lower=lower_list,
                        upper=upper_list,
                        sigma=float(getattr(unc_band, 'sigma', sigma)),
                        label=getattr(unc_band, 'label', None),
                        kind="absolute",
                    )
            except Exception as unc_error:
                # Log but don't fail the entire request if uncertainty processing fails
                print(f"Warning: Could not process uncertainty band: {str(unc_error)}")
                uncertainty_payload = None

        metadata = {
            "file_id": file_id,
            "file_name": request.file_name,
            "data_type": data_type,
            "mt_number": request.mt_number,
            "order": request.order,
            "include_uncertainty": include_unc,
            "sigma": sigma,
            "zaid": info.get('zaid'),
        }

        suggested = {
            "x_label": "Energy (eV)",
            "y_label": "Legendre Coefficient" if data_type == 'angular' else "Relative Uncertainty",
            "title": f"{info.get('isotope', 'ENDF')} MT{request.mt_number} L={request.order}",
            "log_x": True,
            "log_y": False,
        }

        return ENDFSeriesResponse(
            series_id=uuid.uuid4().hex,
            label=label,
            x=plot_data.x.tolist(),
            y=plot_data.y.tolist(),
            x_unit=x_unit,
            y_unit=y_unit,
            plot_style=plot_style,
            line_shape=line_shape,
            metadata=metadata,
            suggested=suggested,
            uncertainty=uncertainty_payload,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting ENDF data series: {str(e)}")
