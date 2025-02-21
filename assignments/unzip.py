import os
import zipfile

basedir = "/workspaces/Shuaigaodada.github.io/assignments"
file = "asd-walker-master.zip"

file = os.path.join(basedir, file)

with zipfile.ZipFile(file, 'r') as zip_ref:
    zip_ref.extractall(basedir)

