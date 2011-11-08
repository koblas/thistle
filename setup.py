#!/usr/bin/env python

from distutils.core import setup

setup(
    name='Thistle',
    version='0.1',
    description='Common Platform Template System',
    author='David Koblas',
    author_email='david@koblas.com',
    url='http://github.com/koblas/thistle',
    package_dir = {'thistle' : 'py/thistle' },
    packages=['thistle'],
)

