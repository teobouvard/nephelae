#!/bin/bash
#sudo apt-get update
sudo apt-get -y install git python3-pip python3-venv

rm -rf nephelae
git clone https://github.com/TeoBouvard/nephelae.git

cd nephelae
python3 -m venv virtual_env
source virtual_env/bin/activate
pip3 install wheel
pip3 install -r requirements.txt

# fix a dependency issue in pptk (Ubuntu 18.04)
mv virtual_env/lib/python3.6/site-packages/pptk/libs/libz.so.1 virtual_env/lib/python3.6/site-packages/pptk/libs/libz.so.1.old
sudo ln -s /lib/x86_64-linux-gnu/libz.so.1 virtual_env/lib/python3.6/site-packages/pptk/libs/

cd web
source runserver.sh
