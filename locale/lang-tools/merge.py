#!/usr/bin/env python3

import argparse
import toml
import sys
import os

def merge_internal(obj1, obj2, res):
    for (k1, k2) in zip(obj1.copy(), obj2.copy()):
        if k1 != k2:
            print('Files are out of order, aborting.\nKey1 {} != Key2 {}'.format(k1, k2), file=sys.stderr)
        if k1 == 'ALERTS' or obj1[k1] == '##MERGED##':
            continue
        if obj1[k1] == obj2[k2]:
            res[k1] = obj1[k1]
            obj1[k1] = '##MERGED##'
            obj2[k1] = '##MERGED##'
        else:
            res[k1] = '##MERGED##'


def merge(filename1, filename2, output_path):
    f1 = toml.load(filename1)
    f2 = toml.load(filename2)
    try:
        merged = toml.load(output_path)
    except:
        merged = {}
    if 'ALERTS' not in merged:
        merged['ALERTS'] = {}
    
    merge_internal(f1, f2, merged)
    merge_internal(f1['ALERTS'], f2['ALERTS'], merged['ALERTS'])
    files = [(filename1, f1), (filename2, f2), (output_path, merged)]
    for (path, obj) in files:
        dirPath = os.path.dirname(path)
        if not os.path.exists(dirPath):
            os.makedirs(dirPath)
        with open(path, 'w') as f:
            toml.dump(obj, f)


# Merge two languages
def main():
    parser = argparse.ArgumentParser(
        description='Merge two languages'
    )
    parser.add_argument('filename1', help='First file to merge')
    parser.add_argument('filename2', help='Second file to merge')
    parser.add_argument('output_path', help='Where to store the output')
    args = parser.parse_args()
    merge(args.filename1, args.filename2, args.output_path)


if __name__ == '__main__':
    main()
