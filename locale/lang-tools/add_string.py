#!/usr/bin/env python3

import argparse
import toml
import sys
import os
from glob import glob
from merge import unmerge

def copy_template_internal(res, template):
    for key in template:
        if key not in res and key != 'ALERTS':
            res[key] = '~~'+ template[key]

def copy_template(template_path, locale_path):
    template = toml.load(template_path)
    for path in glob(locale_path + '/*/*.toml'):
        if 'template' not in path:
            locale = unmerge(path)
            # If this is a merged file, skip it
            if 'info' in locale and locale['info']['merged']:
                continue
            copy_template_internal(locale, template)
            if 'ALERTS' not in locale:
                locale['ALERTS'] = {}
                copy_template_internal(locale['ALERTS'], template['ALERTS'])
            with open(path, 'w') as f:
                toml.dump(locale, f)

def default_template_path(script_path):
    # We need to make sure we take the template based on the script path,
    # Not where the user called the script
    return os.path.dirname(script_path) + '/../template/translation.toml'

def default_locale_path(script_path):
    return os.path.dirname(script_path) + '/../'

def main():
    parser = argparse.ArgumentParser(
        description='Sync all locale files with the template'
    );
    parser.add_argument('--template-path', '-t', help='Template path', default=default_template_path(sys.argv[0]))
    parser.add_argument('--locale-path', '-l', help='Directory where the locale files are stored', default=default_locale_path(sys.argv[0]))
    args = parser.parse_args()
    copy_template(args.template_path, args.locale_path)

if __name__ == '__main__':
    main()
