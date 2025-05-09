# How to Run TRELLIS
---   

### 1) Activate lucasdino/TRELLIS:latest Docker Image   
Can pull this from DockerHub -- this will install dependencies and pull code from the TRELLIS github repo.

### 2) Download the Model and Serve
Run the following once this Docker image has been instantiated:

```
cd /opt/TRELLIS && \
python3 -c "from trellis.pipelines import TrellisImageTo3DPipeline; TrellisImageTo3DPipeline.from_pretrained('JeffreyXiang/TRELLIS-image-large').cuda()" && \
python3 web/run.py
```

### 3) 