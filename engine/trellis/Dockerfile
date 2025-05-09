# Start from NVIDIA CUDA base (Ubuntu 22.04 with CUDA and cuDNN for GPU support)
FROM nvidia/cuda:12.2.2-cudnn8-devel-ubuntu22.04

# Set CUDA architecture list for compatibility (supports RTX 30xx and 40xx GPUs)
ENV TORCH_CUDA_ARCH_LIST="8.0;8.6;8.7;8.9"

# Install system packages and Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-dev git curl ninja-build && \
    rm -rf /var/lib/apt/lists/*

# Install pip
RUN curl -sS https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python3 get-pip.py && rm get-pip.py

# Install PyTorch (ensure version matches CUDA) and core Python dependencies
RUN pip install torch==2.4.0 torchvision==0.19 --index-url https://download.pytorch.org/whl/cu121 && \
    pip install pillow imageio[ffmpeg] tqdm easydict opencv-python-headless scipy ninja \
                onnxruntime trimesh xatlas pyvista pymeshfix igraph transformers

# ----- 4  TRELLIS + heavy deps (spconv, xformers, flash‑attn, etc.) -----------
ENV TORCH_CUDA_ARCH_LIST="8.6;8.9;9.0"
RUN pip install git+https://github.com/EasternJournalist/utils3d.git@9a4eb15 \
    && pip install xformers==0.0.27.post2 --index-url https://download.pytorch.org/whl/cu121 \
    && pip install flash-attn --no-build-isolation \
    && pip install spconv-cu120 \
    && pip install kaolin -f https://nvidia-kaolin.s3.us-east-2.amazonaws.com/torch-2.4.0_cu121.html \
    && git clone https://github.com/autonomousvision/mip-splatting.git /tmp/mip \
    && pip install /tmp/mip/submodules/diff-gaussian-rasterization/    

# Copy the TRELLIS repo into the image (assumes Docker build context is the repo root)
COPY . /opt/trellis
WORKDIR /opt/trellis

# Install TRELLIS as a package (enables clean imports)
RUN pip install -e .

# Install Flask and runtime dependencies for the API
RUN pip install flask rembg diso

# Expose internal port
EXPOSE 5000

# Set the default startup command to launch the API server
CMD ["python", "api/server.py"]