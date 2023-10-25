#!/usr/bin/env python3

import argparse
import sys
from glob import glob
from lang_common import default_locale_path, default_template_path
from add_string import copy_template
from comment_langs import comment_file
from merge import merge

def tame(template_path, locale_path, comment, do_merge, sync):
    if sync:
        for path in glob(locale_path + '/*/*.toml'):
            if 'template' not in path:
                copy_template(path, template_path)
    if do_merge:
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
                parent_path = '/'.join(split_path[:-2] + [split_path[-2].split('-')[0]] + [split_path[-1]])
                merge(paths[0], paths[1], parent_path)
    if comment:
        for path in glob(locale_path + '/*/*.toml'):
            if 'template' not in path:
                comment_file(path, template_path)
def main():
    parser = argparse.ArgumentParser(
        description='Sync, merge and comment all locale files with the template'
    );
    parser.add_argument('--template-path', '-t', help='Template path', default=default_template_path(sys.argv[0]))
    parser.add_argument('--locale-path', '-l', help='Directory where the locale files are stored', default=default_locale_path(sys.argv[0]))
    parser.add_argument('--no-comment', help='Don\'t comment the file', action='store_true')
    parser.add_argument('--no-merge', help='Skip merging', action='store_true')
    parser.add_argument('--no-sync', help='Skip syncing with the template', action='store_true')
    args = parser.parse_args()
    tame(args.template_path, args.locale_path, not args.no_comment, not args.no_merge, not args.no_sync)

if __name__ == '__main__':
    main()
