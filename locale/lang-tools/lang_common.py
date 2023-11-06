import os

def default_template_path(script_path):
    # We need to make sure we take the template based on the script path,
    # Not where the user called the script
    return os.path.dirname(script_path) + '/../template/translation.toml'

def default_locale_path(script_path):
    return os.path.dirname(script_path) + '/../'
