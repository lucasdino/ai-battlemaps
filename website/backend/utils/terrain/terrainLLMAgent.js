const { pipeline } = require('@xenova/transformers');

// Parameter descriptions and ranges for the LLM
const PARAMETER_DESCRIPTIONS = {
    noiseIterations: {
        description: "Controls the level of detail in the terrain. Higher values create more complex, detailed terrain.",
        range: "1-5",
        default: 3
    },
    positionFrequency: {
        description: "Controls the scale of terrain features. Lower values create larger features, higher values create smaller features.",
        range: "0.05-0.3",
        default: 0.175
    },
    warpFrequency: {
        description: "Controls how much the terrain is distorted. Higher values create more complex, twisted terrain.",
        range: "1-10",
        default: 6
    },
    warpStrength: {
        description: "Controls the intensity of the distortion. Higher values create more dramatic terrain features.",
        range: "0.1-2",
        default: 1
    },
    strength: {
        description: "Controls the overall height variation of the terrain. Higher values create more dramatic elevation changes.",
        range: "1-15",
        default: 10
    },
    heightScale: {
        description: "Controls the overall height of the terrain. Higher values create taller terrain.",
        range: "0.5-2",
        default: 1.0
    },
    colorSand: {
        description: "The color of sandy areas in the terrain.",
        range: "Any valid hex color",
        default: "#ffe894"
    },
    colorGrass: {
        description: "The color of grassy areas in the terrain.",
        range: "Any valid hex color",
        default: "#85d534"
    },
    colorSnow: {
        description: "The color of snowy areas in the terrain.",
        range: "Any valid hex color",
        default: "#ffffff"
    },
    colorRock: {
        description: "The color of rocky areas in the terrain.",
        range: "Any valid hex color",
        default: "#bfbd8d"
    }
};

// Few-shot examples for the LLM
const FEW_SHOT_EXAMPLES = [
    {
        description: "A lush green valley with gentle hills and a river",
        reasoning: "This description suggests a peaceful, rolling landscape. We need moderate noise iterations for detail, low warp values for gentle features, and green-dominant colors.",
        params: {
            noiseIterations: 2,
            positionFrequency: 0.12,
            warpFrequency: 2,
            warpStrength: 0.5,
            strength: 3,
            heightScale: 1.0,
            colorSand: '#e2c290',
            colorGrass: '#6bbf59',
            colorSnow: '#ffffff',
            colorRock: '#8d8d7a'
        }
    },
    {
        description: "A snowy mountain range with sharp peaks",
        reasoning: "This description suggests dramatic, high-altitude terrain. We need high noise iterations for detail, high warp values for sharp features, and snow-dominant colors.",
        params: {
            noiseIterations: 5,
            positionFrequency: 0.22,
            warpFrequency: 7,
            warpStrength: 1.2,
            strength: 8,
            heightScale: 1.5,
            colorSand: '#e0e0e0',
            colorGrass: '#b0c4b1',
            colorSnow: '#f8f8ff',
            colorRock: '#b0b0b0'
        }
    },
    {
        description: "A dry desert with rolling dunes",
        reasoning: "This description suggests a smooth, arid landscape. We need low noise iterations for simplicity, low warp values for gentle features, and sand-dominant colors.",
        params: {
            noiseIterations: 1,
            positionFrequency: 0.08,
            warpFrequency: 1,
            warpStrength: 0.2,
            strength: 2,
            heightScale: 0.8,
            colorSand: '#ffe894',
            colorGrass: '#e2c290',
            colorSnow: '#fffbe0',
            colorRock: '#bfbd8d'
        }
    }
];

class TerrainLLMAgent {
    constructor() {
        this.model = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Load a text generation model
            this.model = await pipeline('text-generation', 'Xenova/gpt2');
            this.initialized = true;
            console.log('TerrainLLMAgent initialized successfully');
        } catch (error) {
            console.error('Failed to initialize TerrainLLMAgent:', error);
            throw error;
        }
    }

    buildPrompt(description) {
        return `You are a terrain generation expert. Your task is to generate parameters for creating a 3D terrain based on a natural language description.

Parameter Descriptions:
${Object.entries(PARAMETER_DESCRIPTIONS).map(([key, info]) => 
    `${key}: ${info.description} (Range: ${info.range}, Default: ${info.default})`
).join('\n')}

Examples:
${FEW_SHOT_EXAMPLES.map(example => 
    `Description: ${example.description}
Reasoning: ${example.reasoning}
Parameters: ${JSON.stringify(example.params, null, 2)}`
).join('\n\n')}

Now, generate parameters for this description: "${description}"
First, explain your reasoning, then provide the parameters in JSON format.`;
    }

    async generateTerrainParams(description) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const prompt = this.buildPrompt(description);
            const result = await this.model(prompt, {
                max_length: 1000,
                temperature: 0.7,
                top_p: 0.9,
                repetition_penalty: 1.2
            });

            // Extract the JSON parameters from the model's response
            const response = result[0].generated_text;
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            
            if (!jsonMatch) {
                throw new Error('Failed to extract parameters from model response');
            }

            const params = JSON.parse(jsonMatch[0]);

            // Validate and normalize parameters
            return this.validateAndNormalizeParams(params);
        } catch (error) {
            console.error('Error generating terrain parameters:', error);
            // Return default parameters if something goes wrong
            return this.getDefaultParams();
        }
    }

    validateAndNormalizeParams(params) {
        const normalized = {};
        const warnings = [];
        
        for (const [key, info] of Object.entries(PARAMETER_DESCRIPTIONS)) {
            let value = params[key];
            
            // If parameter is missing, use default
            if (value === undefined) {
                value = info.default;
                warnings.push(`Missing parameter '${key}', using default value: ${value}`);
                continue;
            }

            // Parse range
            const [min, max] = info.range.split('-').map(Number);
            
            // Validate based on parameter type
            if (key.startsWith('color')) {
                value = this.validateColor(value, info.default, warnings);
            } else {
                value = this.validateNumericParameter(value, min, max, info.default, key, warnings);
            }

            // Check for parameter relationships
            if (key === 'warpStrength' && value > 1.5) {
                // If warp strength is high, ensure noise iterations are sufficient
                const noiseIterations = normalized.noiseIterations || params.noiseIterations;
                if (noiseIterations < 3) {
                    warnings.push('High warp strength detected, increasing noise iterations for better detail');
                    normalized.noiseIterations = Math.max(3, noiseIterations);
                }
            }

            // Check for parameter combinations
            if (key === 'strength' && value > 10) {
                // If strength is high, ensure height scale is appropriate
                const heightScale = normalized.heightScale || params.heightScale;
                if (heightScale < 1.2) {
                    warnings.push('High strength detected, increasing height scale for better proportions');
                    normalized.heightScale = Math.max(1.2, heightScale);
                }
            }

            normalized[key] = value;
        }

        // Validate parameter combinations
        this.validateParameterCombinations(normalized, warnings);

        // Log warnings if any
        if (warnings.length > 0) {
            console.warn('Parameter validation warnings:', warnings);
        }

        return normalized;
    }

    validateNumericParameter(value, min, max, defaultValue, paramName, warnings) {
        // Check if value is a number
        if (typeof value !== 'number' || isNaN(value)) {
            warnings.push(`Invalid numeric value for '${paramName}', using default: ${defaultValue}`);
            return defaultValue;
        }

        // Check if value is within range
        if (value < min || value > max) {
            const clamped = Math.max(min, Math.min(max, value));
            warnings.push(`Value for '${paramName}' (${value}) is outside range [${min}, ${max}], clamped to ${clamped}`);
            return clamped;
        }

        // Check for reasonable precision
        if (paramName === 'positionFrequency' || paramName === 'warpStrength') {
            // These parameters should have reasonable precision
            const rounded = Number(value.toFixed(3));
            if (rounded !== value) {
                warnings.push(`Rounded '${paramName}' to 3 decimal places for better performance`);
                return rounded;
            }
        }

        return value;
    }

    validateColor(color, defaultColor, warnings) {
        // Check if it's a valid hex color
        if (!this.isValidHexColor(color)) {
            warnings.push(`Invalid color format: ${color}, using default: ${defaultColor}`);
            return defaultColor;
        }

        // Normalize to 6-digit hex
        if (color.length === 4) {
            color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }

        // Check for reasonable color values
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        // Check for too dark or too bright colors
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness < 20) {
            warnings.push(`Color ${color} is too dark, brightening by 20%`);
            return this.brightenColor(color, 0.2);
        } else if (brightness > 240) {
            warnings.push(`Color ${color} is too bright, darkening by 20%`);
            return this.darkenColor(color, 0.2);
        }

        return color;
    }

    validateParameterCombinations(params, warnings) {
        // Check noise iterations vs position frequency
        if (params.noiseIterations > 3 && params.positionFrequency < 0.1) {
            warnings.push('High noise iterations with low position frequency may cause performance issues');
        }

        // Check warp parameters
        if (params.warpStrength > 1 && params.warpFrequency < 3) {
            warnings.push('High warp strength with low frequency may create unrealistic terrain');
        }

        // Check color combinations
        this.validateColorCombinations(params, warnings);

        // Check height parameters
        if (params.strength * params.heightScale > 20) {
            warnings.push('Combined strength and height scale may create extreme terrain');
        }
    }

    validateColorCombinations(params, warnings) {
        // Check for sufficient contrast between colors
        const colors = [
            { name: 'sand', value: params.colorSand },
            { name: 'grass', value: params.colorGrass },
            { name: 'snow', value: params.colorSnow },
            { name: 'rock', value: params.colorRock }
        ];

        for (let i = 0; i < colors.length; i++) {
            for (let j = i + 1; j < colors.length; j++) {
                const contrast = this.calculateColorContrast(colors[i].value, colors[j].value);
                if (contrast < 30) {
                    warnings.push(`Low contrast between ${colors[i].name} and ${colors[j].name} colors`);
                }
            }
        }
    }

    calculateColorContrast(color1, color2) {
        const getLuminance = (color) => {
            const r = parseInt(color.slice(1, 3), 16) / 255;
            const g = parseInt(color.slice(3, 5), 16) / 255;
            const b = parseInt(color.slice(5, 7), 16) / 255;
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const l1 = getLuminance(color1);
        const l2 = getLuminance(color2);
        return Math.abs(l1 - l2) * 100;
    }

    brightenColor(color, factor) {
        const r = Math.min(255, parseInt(color.slice(1, 3), 16) * (1 + factor));
        const g = Math.min(255, parseInt(color.slice(3, 5), 16) * (1 + factor));
        const b = Math.min(255, parseInt(color.slice(5, 7), 16) * (1 + factor));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    darkenColor(color, factor) {
        const r = Math.max(0, parseInt(color.slice(1, 3), 16) * (1 - factor));
        const g = Math.max(0, parseInt(color.slice(3, 5), 16) * (1 - factor));
        const b = Math.max(0, parseInt(color.slice(5, 7), 16) * (1 - factor));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    isValidHexColor(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }

    getDefaultParams() {
        return Object.fromEntries(
            Object.entries(PARAMETER_DESCRIPTIONS).map(([key, info]) => [key, info.default])
        );
    }
}

// Create and export a single instance
const terrainLLMAgent = new TerrainLLMAgent();
module.exports = terrainLLMAgent; 