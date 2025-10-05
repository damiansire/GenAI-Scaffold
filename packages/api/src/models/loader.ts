import { promises as fs } from 'fs';
import path from 'path';
import { ModelFactory } from './factory.js';
import { SchemaRegistry } from './registry.js';

/**
 * Interface for plugin module exports
 * Each plugin must export these properties
 */
interface PluginModule {
  /** Unique identifier for the model strategy */
  modelId: string;
  /** JSON Schema for input validation */
  configSchema: any;
  /** Constructor function for the model strategy */
  ModelStrategy: new (...args: any[]) => any;
}

/**
 * Load all plugins from the plugins directory
 * @param factory - ModelFactory instance to register strategies
 * @param schemaRegistry - SchemaRegistry instance to register schemas
 * @returns Promise that resolves when all plugins are loaded
 */
export async function loadPlugins(
  factory: ModelFactory,
  schemaRegistry: SchemaRegistry
): Promise<void> {
  const pluginsDir = path.join(process.cwd(), 'src', 'plugins');
  
  try {
    // Check if plugins directory exists
    await fs.access(pluginsDir);
  } catch (error) {
    console.warn(`Plugins directory not found: ${pluginsDir}. Skipping plugin loading.`);
    return;
  }

  try {
    // Read all subdirectories in the plugins folder
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
    const pluginDirectories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    if (pluginDirectories.length === 0) {
      console.info('No plugin directories found. Skipping plugin loading.');
      return;
    }

    console.info(`Found ${pluginDirectories.length} plugin directories: ${pluginDirectories.join(', ')}`);

    // Load each plugin
    const loadPromises = pluginDirectories.map(async (pluginDir) => {
      try {
        await loadSinglePlugin(pluginDir, factory, schemaRegistry);
        console.info(`✅ Successfully loaded plugin: ${pluginDir}`);
      } catch (error) {
        console.error(`❌ Failed to load plugin '${pluginDir}':`, error);
        // Continue loading other plugins even if one fails
      }
    });

    // Wait for all plugins to load (or fail)
    await Promise.allSettled(loadPromises);
    
    console.info(`Plugin loading completed. Registered ${factory.getRegisteredModels().length} strategies and ${schemaRegistry.getRegisteredModels().length} schemas.`);
  } catch (error) {
    console.error('Error reading plugins directory:', error);
    throw error;
  }
}

/**
 * Load a single plugin from a directory
 * @param pluginDir - Name of the plugin directory
 * @param factory - ModelFactory instance
 * @param schemaRegistry - SchemaRegistry instance
 */
async function loadSinglePlugin(
  pluginDir: string,
  factory: ModelFactory,
  schemaRegistry: SchemaRegistry
): Promise<void> {
  const pluginPath = path.join(process.cwd(), 'src', 'plugins', pluginDir);
  
  // Try to import index.ts first, then index.js
  const possibleFiles = ['index.ts', 'index.js'];
  let modulePath: string | null = null;
  
  for (const filename of possibleFiles) {
    const fullPath = path.join(pluginPath, filename);
    try {
      await fs.access(fullPath);
      modulePath = fullPath;
      break;
    } catch {
      // File doesn't exist, try next one
      continue;
    }
  }

  if (!modulePath) {
    throw new Error(`No index.ts or index.js found in plugin directory: ${pluginDir}`);
  }

  // Dynamic import of the plugin module
  const pluginModule = await import(modulePath);
  
  // Validate plugin module structure
  validatePluginModule(pluginModule, pluginDir);
  
  const { modelId, configSchema, ModelStrategy } = pluginModule as PluginModule;
  
  // Register the strategy in the factory
  factory.register(modelId, () => new ModelStrategy());
  
  // Register the schema in the registry
  schemaRegistry.register(modelId, configSchema);
}

/**
 * Validate that a plugin module has the required exports
 * @param module - The imported module
 * @param pluginDir - Name of the plugin directory (for error messages)
 * @throws Error if module is invalid
 */
function validatePluginModule(module: any, pluginDir: string): void {
  const requiredExports = ['modelId', 'configSchema', 'ModelStrategy'];
  const missingExports = requiredExports.filter(exportName => !(exportName in module));
  
  if (missingExports.length > 0) {
    throw new Error(
      `Plugin '${pluginDir}' is missing required exports: ${missingExports.join(', ')}. ` +
      `Required exports: modelId (string), configSchema (object), ModelStrategy (constructor function)`
    );
  }

  // Additional type validation
  if (typeof module.modelId !== 'string') {
    throw new Error(`Plugin '${pluginDir}': modelId must be a string, got ${typeof module.modelId}`);
  }

  if (typeof module.configSchema !== 'object' || module.configSchema === null) {
    throw new Error(`Plugin '${pluginDir}': configSchema must be an object, got ${typeof module.configSchema}`);
  }

  if (typeof module.ModelStrategy !== 'function') {
    throw new Error(`Plugin '${pluginDir}': ModelStrategy must be a constructor function, got ${typeof module.ModelStrategy}`);
  }
}
