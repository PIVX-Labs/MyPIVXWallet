#!/usr/bin/env python3

import argparse
import toml
from glob import glob

def copy_template_internal(res, template):
    for key in template:
        if key not in res and key != 'ALERTS':
            res[key] = '~~'+ template[key]

def copy_template(template_path, locale_path):
    template = toml.load(template_path)
    for path in glob(locale_path + '/*/*.toml'):
        if 'template' not in path:
            print(path)
            locale = toml.load(path)
            copy_template_internal(locale, template)
            if 'ALERTS' not in locale:
                locale['ALERTS'] = {}
                copy_template_internal(locale['ALERTS'], template['ALERTS'])
            with open(path, 'w') as f:
                toml.dump(locale, f)

                

def main():
    parser = argparse.ArgumentParser(
        description='Sync all locale files with the template'
    );
    parser.add_argument('--template-path', '-t', help='Template path', default='template/translation.toml')
    parser.add_argument('--locale-path', '-l', help='Directory where the locale files are stored', default='.')
    args = parser.parse_args()
    copy_template(args.template_path, args.locale_path)

if __name__ == '__main__':
    main()
