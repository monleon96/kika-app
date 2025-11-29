import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File
from kika.plotting.plot_builder import PlotBuilder
import matplotlib.pyplot as plt

from ..models import (
    ACEParseRequest, ACEInfoResponse, PlotRequest, PlotResponse,
    SeriesRequest, SeriesResponse
)
from ..services.ace_service import load_ace_object, extract_ace_metadata, update_ace_cache_filename
from ..services.plot_service import generate_plot_image

router = APIRouter(prefix="/api/ace", tags=["ace"])

@router.post("/parse", response_model=ACEInfoResponse)
async def parse_ace_file(request: ACEParseRequest):
    """
    Parse ACE file and return basic information
    """
    try:
        file_id, ace_obj, info = load_ace_object(
            file_id=None,
            file_content=request.file_content,
            file_name=request.file_name,
        )
        update_ace_cache_filename(file_id, request.file_name)
        return ACEInfoResponse(file_id=file_id, **info)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing ACE file: {str(e)}")

@router.post("/plot", response_model=PlotResponse)
async def generate_plot(request: PlotRequest):
    """
    Generate plot from ACE file data and return as base64 image
    """
    try:
        file_id, ace_obj, _ = load_ace_object(
            file_id=request.file_id,
            file_content=request.file_content,
            file_name=request.file_name,
        )
        
        fig = None
        
        if request.plot_type == 'xs' and request.mt_number:
            plot_data = ace_obj.to_plot_data('xs', mt=request.mt_number)
            builder = PlotBuilder(figsize=(10, 6))
            builder.add_data(plot_data)
            builder.set_labels(
                title=f'{ace_obj.zaid} - MT{request.mt_number}',
                x_label='Energy (MeV)',
                y_label='Cross Section (barns)'
            )
            builder.set_scales(log_x=True, log_y=True)
            fig = builder.build()
                
        elif request.plot_type == 'angular' and request.mt_number:
            energy = request.energy if request.energy is not None else 1.0
            plot_data = ace_obj.to_plot_data('angular', mt=request.mt_number, energy=energy)
            builder = PlotBuilder(figsize=(10, 6))
            builder.add_data(plot_data)
            builder.set_labels(
                title=f'{ace_obj.zaid} - Angular Distribution MT{request.mt_number} at {energy} MeV',
                x_label='Cosine of Scattering Angle',
                y_label='Probability'
            )
            fig = builder.build()
        
        if fig is None:
            raise HTTPException(status_code=400, detail="Could not generate plot - no data available")
        
        image_base64 = generate_plot_image(fig)
        return PlotResponse(image_base64=image_base64)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating plot: {str(e)}")

@router.post("/series", response_model=SeriesResponse)
async def get_series_data(request: SeriesRequest):
    """
    Return raw x/y data so the client can render interactive plots.
    """
    try:
        file_id, ace_obj, info = load_ace_object(
            file_id=request.file_id,
            file_content=request.file_content,
            file_name=request.file_name,
        )
        if not info:
            info = extract_ace_metadata(ace_obj)

        if request.plot_type == 'xs':
            plot_data = ace_obj.to_plot_data('xs', mt=request.mt_number)
            x_unit = "Energy (MeV)"
            y_unit = "Cross Section (barns)"
            suggested = {
                "x_label": "Energy (MeV)",
                "y_label": "Cross Section (barns)",
                "log_x": True,
                "log_y": True,
                "title": f"{info.get('zaid', 'ACE')} MT{request.mt_number}",
            }
            energy_value = None
        else:
            energy_value = request.energy if request.energy is not None else 1.0
            plot_data = ace_obj.to_plot_data('angular', mt=request.mt_number, energy=energy_value)
            x_unit = "cos(theta)"
            y_unit = "Probability Density"
            suggested = {
                "x_label": "cos(theta)",
                "y_label": "Probability Density",
                "log_x": False,
                "log_y": False,
                "title": f"{info.get('zaid', 'ACE')} MT{request.mt_number} @ {energy_value} MeV",
            }

        metadata = {
            "file_id": file_id,
            "file_name": request.file_name,
            "mt_number": request.mt_number,
            "plot_type": request.plot_type,
            "energy": energy_value,
            "zaid": info.get('zaid', 'unknown'),
            "point_count": len(plot_data.x),
        }

        return SeriesResponse(
            series_id=uuid.uuid4().hex,
            label=plot_data.label or suggested["title"],
            x=plot_data.x.tolist(),
            y=plot_data.y.tolist(),
            x_unit=x_unit,
            y_unit=y_unit,
            metadata=metadata,
            suggested=suggested,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting data series: {str(e)}")

@router.post("/upload")
async def upload_ace_file(file: UploadFile = File(...)):
    """
    Upload and parse ACE file (alternative endpoint using multipart/form-data)
    """
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        
        request = ACEParseRequest(
            file_content=content_str,
            file_name=file.filename or "unknown.ace"
        )
        
        # Call the parse function directly
        return await parse_ace_file(request)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing uploaded file: {str(e)}")
