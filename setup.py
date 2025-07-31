#!/usr/bin/env python3
"""
ZORA CORE - AI Orchestration Platform Setup
Advanced setup configuration for ZORA CORE system
"""

from setuptools import setup, find_packages
import os

def read_requirements():
    """Read requirements from requirements.txt"""
    with open('requirements.txt', 'r') as f:
        return [line.strip() for line in f if line.strip() and not line.startswith('#')]

def read_readme():
    """Read README for long description"""
    if os.path.exists('README.md'):
        with open('README.md', 'r', encoding='utf-8') as f:
            return f.read()
    return "ZORA CORE - AI Orchestration Platform"

setup(
    name="zora-core",
    version="1.0.0",
    author="Mads Pallisgaard Petersen",
    author_email="mrpallis@gmail.com",
    description="Advanced AI Orchestration Platform with Infinity Engine™",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    url="https://github.com/THEZORACORE/ZORA-CORE",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.8",
    install_requires=read_requirements(),
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.0.0",
            "pre-commit>=3.0.0",
        ],
        "docs": [
            "sphinx>=6.0.0",
            "sphinx-rtd-theme>=1.2.0",
            "myst-parser>=1.0.0",
        ],
        "deployment": [
            "gunicorn>=21.0.0",
            "docker>=6.0.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "zora-core=zora:main",
            "zora-infinity=infinity:main",
            "zora-boot=zora_boot:main",
            "zora-trinity=connor:trinity_main",
        ],
    },
    include_package_data=True,
    package_data={
        "zora_core": [
            "config/*.yaml",
            "templates/*.html",
            "static/*",
        ],
    },
    project_urls={
        "Bug Reports": "https://github.com/THEZORACORE/ZORA-CORE/issues",
        "Source": "https://github.com/THEZORACORE/ZORA-CORE",
        "Documentation": "https://zora-core.readthedocs.io/",
    },
    keywords="ai artificial-intelligence orchestration infinity-engine agi automation",
    zip_safe=False,
)
