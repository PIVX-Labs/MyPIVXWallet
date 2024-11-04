#!/usr/bin/env python3

import argparse
import glob
import os
import sys
import toml
from lang_common import default_template_path

def check(script_path, template_path):
    template = toml.load(template_path)
    seen_keys = {key: False for key in template}
    
    os.chdir(script_path)
    files = glob.glob('**/*.js', recursive=True) + glob.glob('**/*.vue', recursive=True) + ['../index.template.html']
    for file in files:
        with open(file, 'r') as f:
            for line in f:
                for key in seen_keys:
                    if not seen_keys[key]:
                        if key in line:
                            seen_keys[key] = True


    return [i for i in filter(lambda x: not seen_keys[x], seen_keys)]

def main():
    parser = argparse.ArgumentParser(
        description="Check for unused language keys"
    )
    parser.add_argument('path', help="path of script folder")
    parser.add_argument('--template-path', '-t', help="Template path", default=default_template_path(sys.argv[0]))
    args = parser.parse_args()
    print('\n'.join(check(args.path, args.template_path)))

if __name__ == '__main__':
    main()
