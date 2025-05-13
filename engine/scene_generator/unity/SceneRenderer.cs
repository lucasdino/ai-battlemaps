using UnityEngine;
using System.Collections.Generic;
using System.IO;
using UnityEditor;

public class SceneRenderer : MonoBehaviour
{
    [Header("Scene Settings")]
    public string sceneJsonPath = "Assets/Scenes/scene_unity.json";
    public bool autoLoadOnStart = true;
    
    [Header("Rendering Settings")]
    public Material defaultTerrainMaterial;
    public Material waterMaterial;
    public Material sandMaterial;
    public Material grassMaterial;
    public Material mountainMaterial;
    
    [Header("Prefab Settings")]
    public GameObject defaultFeaturePrefab;
    public GameObject defaultPropPrefab;
    
    private Terrain terrain;
    private List<GameObject> placedObjects = new List<GameObject>();
    
    void Start()
    {
        if (autoLoadOnStart)
        {
            LoadAndRenderScene();
        }
    }
    
    public void LoadAndRenderScene()
    {
        // Clear existing scene
        ClearScene();
        
        // Load JSON data
        string jsonContent = File.ReadAllText(sceneJsonPath);
        SceneData data = JsonUtility.FromJson<SceneData>(jsonContent);
        
        // Create terrain
        CreateTerrain(data.terrain);
        
        // Place features and props
        PlaceObjects(data.features, "Features");
        PlaceObjects(data.props, "Props");
        
        // Setup navigation
        SetupNavigation(data.navigation);
        
        // Setup camera
        SetupCamera(data.metadata);
        
        // Setup lighting
        SetupLighting();
    }
    
    private void ClearScene()
    {
        // Remove existing terrain
        if (terrain != null)
        {
            DestroyImmediate(terrain.gameObject);
        }
        
        // Remove placed objects
        foreach (var obj in placedObjects)
        {
            if (obj != null)
            {
                DestroyImmediate(obj);
            }
        }
        placedObjects.Clear();
    }
    
    private void CreateTerrain(TerrainData terrainData)
    {
        // Create terrain object
        GameObject terrainObj = new GameObject("Terrain");
        terrain = terrainObj.AddComponent<Terrain>();
        terrain.terrainData = new TerrainData();
        
        // Set height map
        float[,] heights = new float[terrainData.size.width, terrainData.size.height];
        for (int y = 0; y < terrainData.size.height; y++)
        {
            for (int x = 0; x < terrainData.size.width; x++)
            {
                heights[y, x] = terrainData.height_map[y][x];
            }
        }
        terrain.terrainData.SetHeights(0, 0, heights);
        
        // Apply textures
        TerrainLayer[] layers = new TerrainLayer[terrainData.texture_layers.Length];
        for (int i = 0; i < terrainData.texture_layers.Length; i++)
        {
            layers[i] = new TerrainLayer();
            Material material = GetMaterialForLayer(terrainData.texture_layers[i].name);
            if (material != null)
            {
                layers[i].diffuseTexture = material.mainTexture;
                layers[i].tileSize = new Vector2(
                    terrainData.texture_layers[i].tiling.x,
                    terrainData.texture_layers[i].tiling.y
                );
            }
        }
        terrain.terrainData.terrainLayers = layers;
        
        // Add collider
        terrainObj.AddComponent<TerrainCollider>().terrainData = terrain.terrainData;
    }
    
    private Material GetMaterialForLayer(string layerName)
    {
        switch (layerName.ToLower())
        {
            case "water": return waterMaterial;
            case "sand": return sandMaterial;
            case "grass": return grassMaterial;
            case "mountain": return mountainMaterial;
            default: return defaultTerrainMaterial;
        }
    }
    
    private void PlaceObjects(List<ObjectData> objects, string parentName)
    {
        GameObject parent = new GameObject(parentName);
        placedObjects.Add(parent);
        
        foreach (var obj in objects)
        {
            GameObject prefab = GetPrefabForType(obj.prefab_name);
            if (prefab != null)
            {
                Vector3 position = new Vector3(
                    obj.position.x,
                    obj.position.y,
                    obj.position.z
                );
                
                Quaternion rotation = Quaternion.Euler(
                    obj.rotation.x,
                    obj.rotation.y,
                    obj.rotation.z
                );
                
                Vector3 scale = new Vector3(
                    obj.scale.x,
                    obj.scale.y,
                    obj.scale.z
                );
                
                GameObject instance = Instantiate(prefab, position, rotation, parent.transform);
                instance.transform.localScale = scale;
                
                if (obj.is_static)
                {
                    instance.isStatic = true;
                }
                
                if (obj.collider_enabled)
                {
                    AddCollider(instance);
                }
            }
        }
    }
    
    private GameObject GetPrefabForType(string type)
    {
        // Try to find prefab in Resources folder
        GameObject prefab = Resources.Load<GameObject>($"Prefabs/{type}");
        if (prefab == null)
        {
            // Use default prefab if specific one not found
            if (type.Contains("feature"))
            {
                return defaultFeaturePrefab;
            }
            else
            {
                return defaultPropPrefab;
            }
        }
        return prefab;
    }
    
    private void AddCollider(GameObject obj)
    {
        // Add appropriate collider based on object type
        if (obj.GetComponent<MeshFilter>() != null)
        {
            MeshCollider collider = obj.AddComponent<MeshCollider>();
            collider.convex = false;
        }
        else
        {
            BoxCollider collider = obj.AddComponent<BoxCollider>();
            collider.size = Vector3.one;
        }
    }
    
    private void SetupNavigation(NavigationData navData)
    {
        // Create NavMesh from navigation data
        NavMeshData navMeshData = new NavMeshData();
        NavMeshBuildSettings settings = NavMesh.GetSettingsByID(0);
        
        // Convert navigation mesh to NavMeshBuildSource
        List<NavMeshBuildSource> sources = new List<NavMeshBuildSource>();
        NavMeshBuildSource source = new NavMeshBuildSource();
        source.shape = NavMeshBuildSourceShape.Terrain;
        source.sourceObject = terrain.terrainData;
        sources.Add(source);
        
        // Build NavMesh
        NavMeshBuilder.UpdateNavMeshData(navMeshData, settings, sources, new Bounds(Vector3.zero, new Vector3(1000, 1000, 1000)));
        NavMesh.AddNavMeshData(navMeshData);
    }
    
    private void SetupCamera(Metadata metadata)
    {
        // Find or create main camera
        Camera mainCamera = Camera.main;
        if (mainCamera == null)
        {
            GameObject cameraObj = new GameObject("Main Camera");
            mainCamera = cameraObj.AddComponent<Camera>();
            cameraObj.tag = "MainCamera";
        }
        
        // Position camera to view the scene
        float sceneSize = Mathf.Max(metadata.world_size.width, metadata.world_size.height);
        mainCamera.transform.position = new Vector3(sceneSize/2, sceneSize, -sceneSize/2);
        mainCamera.transform.rotation = Quaternion.Euler(45, 0, 0);
        
        // Add camera controller
        CameraController controller = mainCamera.gameObject.AddComponent<CameraController>();
        controller.sceneSize = sceneSize;
    }
    
    private void SetupLighting()
    {
        // Create directional light
        GameObject lightObj = new GameObject("Directional Light");
        Light light = lightObj.AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 1.0f;
        light.shadows = LightShadows.Soft;
        
        // Position light
        lightObj.transform.rotation = Quaternion.Euler(50, -30, 0);
    }
}

// Camera controller for scene navigation
public class CameraController : MonoBehaviour
{
    public float sceneSize = 100f;
    public float moveSpeed = 20f;
    public float rotateSpeed = 100f;
    public float zoomSpeed = 10f;
    
    private float currentZoom;
    
    void Start()
    {
        currentZoom = sceneSize;
    }
    
    void Update()
    {
        // Movement
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");
        transform.Translate(new Vector3(horizontal, 0, vertical) * moveSpeed * Time.deltaTime);
        
        // Rotation
        if (Input.GetMouseButton(1))
        {
            float mouseX = Input.GetAxis("Mouse X");
            transform.Rotate(Vector3.up, mouseX * rotateSpeed * Time.deltaTime);
        }
        
        // Zoom
        float scroll = Input.GetAxis("Mouse ScrollWheel");
        currentZoom = Mathf.Clamp(currentZoom - scroll * zoomSpeed, 10f, sceneSize * 2);
        transform.position = new Vector3(transform.position.x, currentZoom, transform.position.z);
    }
}

// Data classes to match the JSON structure
[System.Serializable]
public class SceneData
{
    public TerrainData terrain;
    public List<ObjectData> features;
    public List<ObjectData> props;
    public NavigationData navigation;
    public Metadata metadata;
}

[System.Serializable]
public class TerrainData
{
    public List<List<float>> height_map;
    public Size size;
    public float height_scale;
    public TextureLayer[] texture_layers;
}

[System.Serializable]
public class ObjectData
{
    public string prefab_name;
    public Vector3Data position;
    public Vector3Data rotation;
    public Vector3Data scale;
    public bool is_static;
    public bool collider_enabled;
}

[System.Serializable]
public class Vector3Data
{
    public float x;
    public float y;
    public float z;
}

[System.Serializable]
public class NavigationData
{
    public List<List<bool>> nav_mesh;
    public float walkable_height;
    public float walkable_radius;
    public float walkable_climb;
    public float walkable_slope;
}

[System.Serializable]
public class Metadata
{
    public Size world_size;
    public float grid_size;
    public string style;
    public string prompt;
}

[System.Serializable]
public class Size
{
    public int width;
    public int height;
    public float depth;
}

[System.Serializable]
public class TextureLayer
{
    public string name;
    public float threshold;
    public Vector2Data tiling;
}

[System.Serializable]
public class Vector2Data
{
    public float x;
    public float y;
} 