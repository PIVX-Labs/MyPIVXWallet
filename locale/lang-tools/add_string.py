#!/usr/bin/env python3

import argparse
import toml
import sys
from lang_common import default_template_path, default_locale_path
from merge import unmerge

def copy_template_internal(res, template):
    for key in template:
        if key not in res and key != 'ALERTS':
            res[key] = ''

def copy_template(file_path, template_path):
    template = toml.load(template_path)
    locale = unmerge(file_path)
    # Skip files that are merged
    if 'info' in locale and locale['info']['merged']:
        return
    copy_template_internal(locale, template)
    if 'ALERTS' not in locale:
        locale['ALERTS'] = {}
    copy_template_internal(locale['ALERTS'], template['ALERTS'])
    with open(file_path, 'w') as f:
        toml.dump(locale, f)

def main():
    parser = argparse.ArgumentParser(
        description='Sync a locale file with the template'
    );
    parser.add_argument('file', help='File to sync')
    parser.add_argument('--template-path', '-t', help='Template path', default=default_template_path(sys.argv[0]))
    args = parser.parse_args()
    copy_template(args.file, args.template_path)

if __name__ == '__main__':
    main()
