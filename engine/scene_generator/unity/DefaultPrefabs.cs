using UnityEngine;
using UnityEditor;

public class DefaultPrefabs : MonoBehaviour
{
    [MenuItem("AI Battlemaps/Create Default Prefabs")]
    public static void CreateDefaultPrefabs()
    {
        // Create folders if they don't exist
        if (!AssetDatabase.IsValidFolder("Assets/Prefabs"))
        {
            AssetDatabase.CreateFolder("Assets", "Prefabs");
        }
        if (!AssetDatabase.IsValidFolder("Assets/Prefabs/Features"))
        {
            AssetDatabase.CreateFolder("Assets/Prefabs", "Features");
        }
        if (!AssetDatabase.IsValidFolder("Assets/Prefabs/Props"))
        {
            AssetDatabase.CreateFolder("Assets/Prefabs", "Props");
        }
        
        // Create default feature prefab
        GameObject featureObj = new GameObject("DefaultFeature");
        MeshFilter meshFilter = featureObj.AddComponent<MeshFilter>();
        MeshRenderer meshRenderer = featureObj.AddComponent<MeshRenderer>();
        
        // Create a simple cube mesh
        Mesh mesh = new Mesh();
        mesh.vertices = new Vector3[]
        {
            new Vector3(-0.5f, -0.5f, -0.5f),
            new Vector3(0.5f, -0.5f, -0.5f),
            new Vector3(0.5f, 0.5f, -0.5f),
            new Vector3(-0.5f, 0.5f, -0.5f),
            new Vector3(-0.5f, -0.5f, 0.5f),
            new Vector3(0.5f, -0.5f, 0.5f),
            new Vector3(0.5f, 0.5f, 0.5f),
            new Vector3(-0.5f, 0.5f, 0.5f)
        };
        mesh.triangles = new int[]
        {
            0, 2, 1, 0, 3, 2,
            1, 6, 5, 1, 2, 6,
            5, 7, 4, 5, 6, 7,
            4, 3, 0, 4, 7, 3,
            3, 6, 2, 3, 7, 6,
            4, 1, 5, 4, 0, 1
        };
        mesh.RecalculateNormals();
        meshFilter.mesh = mesh;
        
        // Create default material
        Material material = new Material(Shader.Find("Standard"));
        material.color = Color.grey;
        meshRenderer.material = material;
        
        // Add collider
        BoxCollider collider = featureObj.AddComponent<BoxCollider>();
        collider.size = Vector3.one;
        
        // Save as prefab
        PrefabUtility.SaveAsPrefabAsset(featureObj, "Assets/Prefabs/Features/DefaultFeature.prefab");
        DestroyImmediate(featureObj);
        
        // Create default prop prefab
        GameObject propObj = new GameObject("DefaultProp");
        meshFilter = propObj.AddComponent<MeshFilter>();
        meshRenderer = propObj.AddComponent<MeshRenderer>();
        
        // Create a simple cylinder mesh
        mesh = new Mesh();
        int segments = 12;
        Vector3[] vertices = new Vector3[segments * 2 + 2];
        int[] triangles = new int[segments * 12];
        
        // Create vertices
        vertices[0] = new Vector3(0, 0.5f, 0);
        vertices[1] = new Vector3(0, -0.5f, 0);
        
        for (int i = 0; i < segments; i++)
        {
            float angle = i * 2 * Mathf.PI / segments;
            float x = Mathf.Cos(angle) * 0.5f;
            float z = Mathf.Sin(angle) * 0.5f;
            vertices[i + 2] = new Vector3(x, 0.5f, z);
            vertices[i + segments + 2] = new Vector3(x, -0.5f, z);
        }
        
        // Create triangles
        int triIndex = 0;
        for (int i = 0; i < segments; i++)
        {
            int next = (i + 1) % segments;
            
            // Top cap
            triangles[triIndex++] = 0;
            triangles[triIndex++] = i + 2;
            triangles[triIndex++] = next + 2;
            
            // Bottom cap
            triangles[triIndex++] = 1;
            triangles[triIndex++] = next + segments + 2;
            triangles[triIndex++] = i + segments + 2;
            
            // Side
            triangles[triIndex++] = i + 2;
            triangles[triIndex++] = i + segments + 2;
            triangles[triIndex++] = next + 2;
            
            triangles[triIndex++] = next + 2;
            triangles[triIndex++] = i + segments + 2;
            triangles[triIndex++] = next + segments + 2;
        }
        
        mesh.vertices = vertices;
        mesh.triangles = triangles;
        mesh.RecalculateNormals();
        meshFilter.mesh = mesh;
        
        // Create default material
        material = new Material(Shader.Find("Standard"));
        material.color = Color.white;
        meshRenderer.material = material;
        
        // Add collider
        CylinderCollider collider2 = propObj.AddComponent<CylinderCollider>();
        collider2.radius = 0.5f;
        collider2.height = 1f;
        
        // Save as prefab
        PrefabUtility.SaveAsPrefabAsset(propObj, "Assets/Prefabs/Props/DefaultProp.prefab");
        DestroyImmediate(propObj);
        
        Debug.Log("Default prefabs created successfully!");
    }
}

// Custom collider for cylinder shape
public class CylinderCollider : MonoBehaviour
{
    public float radius = 0.5f;
    public float height = 1f;
    
    void OnDrawGizmos()
    {
        Gizmos.color = Color.green;
        Gizmos.DrawWireCylinder(transform.position, transform.up, radius, height);
    }
} 