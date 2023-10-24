#!/usr/bin/env python3

import argparse
import toml
import sys
import os
from lang_common import default_template_path, default_locale_path
from glob import glob
from merge import unmerge, merge
from comment_langs import comment_file

def copy_template_internal(res, template):
    for key in template:
        if key not in res and key != 'ALERTS':
            res[key] = '~~'+ template[key]

def copy_template(template_path, locale_path, comment, merge_files):
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
            if comment:
                comment_file(path, template_path)

    if merge_files:
        path_dict = {}
        for path in glob(locale_path + '/*/*.toml'):
            bn = path.split('/')[-2]
            if '-' in bn:
                lang = bn.split('-')
                path_dict[lang[0]] = path_dict.get(lang[0], []) + [path]
        for lang in path_dict:
            paths = path_dict[lang]
            # TODO: add merging support to more than 2 languages
            if len(paths) == 2:
                split_path = paths[0].split('/')
                new_path = '/'.join(split_path[:2] + [split_path[-2].split('-')[0]] + [split_path[-1]])
                merge(paths[0], paths[1], new_path)
                if comment:
                    comment_file(new_path, template_path)
            


def main():
    parser = argparse.ArgumentParser(
        description='Sync all locale files with the template'
    );
    parser.add_argument('--template-path', '-t', help='Template path', default=default_template_path(sys.argv[0]))
    parser.add_argument('--locale-path', '-l', help='Directory where the locale files are stored', default=default_locale_path(sys.argv[0]))
    parser.add_argument('--no-comment', help='Don\'t comment the file', action='store_true')
    parser.add_argument('--no-merge', help='Skip merging', action='store_true')
    args = parser.parse_args()
    copy_template(args.template_path, args.locale_path, not args.no_comment, not args.no_merge)

if __name__ == '__main__':
    main()
