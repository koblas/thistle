#!/usr/bin/env python

from distutils.core import setup

install_requires = []

version = "0.1"

setup(
    name='Thistle',
    version=version,
    description='Common Platform Template System',
    author='David Koblas',
    author_email='david@koblas.com',
    url='http://github.com/koblas/thistle',
    install_requires=install_requires,
    package_dir = {'thistle' : 'py/thistle' },
    packages=['thistle'],
)

