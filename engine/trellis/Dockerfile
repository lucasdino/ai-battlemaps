FROM nvidia/cuda:12.2.2-cudnn8-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV HF_HOME=/root/.cache/huggingface

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-dev python3-pip git curl \
    ninja-build libgl1 libglib2.0-0 libxrender1 libsm6 libxext6 \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3 /usr/bin/python

# Python packages
RUN pip install --upgrade pip
RUN pip install \
    torch==2.1.0+cu121 torchvision==0.16.0+cu121 -f https://download.pytorch.org/whl/torch_stable.html \
    pillow imageio imageio-ffmpeg tqdm easydict opencv-python-headless \
    scipy ninja onnxruntime trimesh xatlas pyvista pymeshfix igraph transformers \
    gradio huggingface_hub \
    git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e4021b67b12c460c7057d642626897ec8

# Clone and install TRELLIS
WORKDIR /opt
RUN git clone --recurse-submodules https://github.com/microsoft/TRELLIS.git
WORKDIR /opt/TRELLIS
RUN chmod +x setup.sh && \
    ./setup.sh --basic --xformers --flash-attn --diffoctreerast --spconv --mipgaussian --kaolin --nvdiffrast