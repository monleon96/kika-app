import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from kika.plotting.plot_builder import PlotBuilder

def generate_plot_image(fig, format='png', dpi=100):
    """Convert matplotlib figure to base64 string"""
    buf = io.BytesIO()
    fig.savefig(buf, format=format, dpi=dpi, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def convert_plotly_linestyle(plotly_style: str) -> str:
    """Convert Plotly line style to Matplotlib line style"""
    mapping = {
        'solid': '-',
        'dash': '--',
        'dot': ':',
        'dashdot': '-.',
    }
    return mapping.get(plotly_style, '-')

def convert_plotly_marker(plotly_marker: str) -> str:
    """Convert Plotly marker symbol to Matplotlib marker"""
    mapping = {
        'circle': 'o',
        'square': 's',
        'triangle-up': '^',
        'triangle-down': 'v',
        'diamond': 'D',
        'star': '*',
        'x': 'x',
        'cross': '+',
    }
    return mapping.get(plotly_marker, 'o')
