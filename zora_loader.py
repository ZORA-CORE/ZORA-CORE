# Dynamically loads all modules in 'modules' folder
import os, importlib.util
modules_path = os.path.join(os.path.dirname(__file__), 'modules')
for file in os.listdir(modules_path):
    if file.endswith('.py'):
        spec = importlib.util.spec_from_file_location(file[:-3], os.path.join(modules_path, file))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
