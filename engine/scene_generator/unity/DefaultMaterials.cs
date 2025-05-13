using UnityEngine;
using UnityEditor;

public class DefaultMaterials : MonoBehaviour
{
    [MenuItem("AI Battlemaps/Create Default Materials")]
    public static void CreateDefaultMaterials()
    {
        // Create folders if they don't exist
        if (!AssetDatabase.IsValidFolder("Assets/Materials"))
        {
            AssetDatabase.CreateFolder("Assets", "Materials");
        }
        if (!AssetDatabase.IsValidFolder("Assets/Materials/Terrain"))
        {
            AssetDatabase.CreateFolder("Assets/Materials", "Terrain");
        }
        
        // Create default terrain material
        Material defaultMat = new Material(Shader.Find("Standard"));
        defaultMat.color = Color.grey;
        AssetDatabase.CreateAsset(defaultMat, "Assets/Materials/Terrain/Default.mat");
        
        // Create water material
        Material waterMat = new Material(Shader.Find("Standard"));
        waterMat.color = new Color(0.2f, 0.4f, 0.8f, 0.8f);
        waterMat.SetFloat("_Mode", 3); // Transparent mode
        waterMat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
        waterMat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
        waterMat.SetInt("_ZWrite", 0);
        waterMat.DisableKeyword("_ALPHATEST_ON");
        waterMat.EnableKeyword("_ALPHABLEND_ON");
        waterMat.DisableKeyword("_ALPHAPREMULTIPLY_ON");
        waterMat.renderQueue = 3000;
        AssetDatabase.CreateAsset(waterMat, "Assets/Materials/Terrain/Water.mat");
        
        // Create sand material
        Material sandMat = new Material(Shader.Find("Standard"));
        sandMat.color = new Color(0.8f, 0.7f, 0.5f);
        sandMat.SetFloat("_Glossiness", 0.1f);
        AssetDatabase.CreateAsset(sandMat, "Assets/Materials/Terrain/Sand.mat");
        
        // Create grass material
        Material grassMat = new Material(Shader.Find("Standard"));
        grassMat.color = new Color(0.3f, 0.6f, 0.3f);
        grassMat.SetFloat("_Glossiness", 0.2f);
        AssetDatabase.CreateAsset(grassMat, "Assets/Materials/Terrain/Grass.mat");
        
        // Create mountain material
        Material mountainMat = new Material(Shader.Find("Standard"));
        mountainMat.color = new Color(0.5f, 0.5f, 0.5f);
        mountainMat.SetFloat("_Glossiness", 0.1f);
        AssetDatabase.CreateAsset(mountainMat, "Assets/Materials/Terrain/Mountain.mat");
        
        Debug.Log("Default materials created successfully!");
    }
} 