import os
import sys

# Add the project root directory to the python path so imports of 'backend' work correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.main import app
