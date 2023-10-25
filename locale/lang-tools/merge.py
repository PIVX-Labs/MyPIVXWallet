#!/usr/bin/env python3

import argparse
import toml
import os

## Unmerges a file
def unmerge(path):
    p = path.split('/')
    if '-' not in p[-2]:
        return toml.load(path)
    p[-2] = p[-2].split('-')[0]
    parent_path = '/'.join(p)
    if not os.path.exists(parent_path):
        return toml.load(path)
    parent = toml.load(parent_path)
    child = toml.load(path)
    del parent['info']
    alerts = parent['ALERTS']
    alerts.update(child['ALERTS'])
    parent.update(child)
    parent['ALERTS'] = alerts
    return parent

def merge_internal(obj1, obj2, res):
    for (k1, k2) in zip(obj1.copy(), obj2.copy()):
        if k1 != k2:
            raise ValueError('Files are out of order. \nKey1 {} != Key2 {}'.format(k1, k2))
        if k1 == 'ALERTS':
            continue
        if obj1[k1] == "" or obj2[k2] == "":
            continue
        if obj1[k1] == obj2[k2]:
            res[k1] = obj1[k1]
            del obj1[k1]
            del obj2[k1]
        else:
            if k1 in res:
                del res[k1]


def merge(filename1, filename2, output_path):
    f1 = unmerge(filename1)
    f2 = unmerge(filename2)
    try:
        merged = toml.load(output_path)
    except:
        merged = {}
    if 'ALERTS' not in merged:
        merged['ALERTS'] = {}
    
    merge_internal(f1, f2, merged)
    merge_internal(f1['ALERTS'], f2['ALERTS'], merged['ALERTS'])
    if 'info' not in merged:
        merged['info'] = {}
    merged['info']['merged'] = True
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
