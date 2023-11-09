#!/usr/bin/env python3

import argparse
import sys
from os import path
from glob import glob
from lang_common import default_template_path, default_locale_path
import toml

def comment_file(locale_file, template_path):
    if path.abspath(locale_file) == path.abspath(template_path):
        return
    with open(locale_file, 'r+') as locale_file:
        lines = locale_file.readlines()
        locale_file.seek(0)
        locale_file.truncate()
        template = toml.load(template_path)
        for line in lines:
            # Only get variable lines, and skip already commented ones
            if '=' in line and '#' not in line:
                # Get the name of the key
                key_name = line.split(' ')[0]
                if key_name in template:
                    locale_file.write(line.strip() + ' # {}\n'.format(template[key_name]))
                elif key_name in template['ALERTS']:
                    locale_file.write(line.strip() + ' # {}\n'.format(template['ALERTS'][key_name]))
                else:
                    locale_file.write(line)
            else:
                locale_file.write(line)
            
def comment_files(locale_dir, template_path):
    if path.isdir(locale_dir):
        for locale_file in glob(locale_dir + '/*/*.toml'):
            comment_file(locale_file, template_path)
    else:
        comment_file(locale_dir, template_path)

def main():
    parser = argparse.ArgumentParser(
        description='Comment locale files with another language strings'
    )
    parser.add_argument('locale_dir', help='Locale directory or file to comment', default=default_locale_path(sys.argv[0]))
    parser.add_argument('--template-path', '-t', help='Template path', default=default_template_path(sys.argv[0]))

    args = parser.parse_args()
    comment_files(args.locale_dir, args.template_path)

if __name__ == '__main__':
    main()
