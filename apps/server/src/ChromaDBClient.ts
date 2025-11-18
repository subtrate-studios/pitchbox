import { ChromaClient, Collection, OpenAIEmbeddingFunction } from 'chromadb';

export interface ChromaDBConfig {
  host?: string;
  port?: number;
  openaiApiKey: string;
}

export class ChromaDBClientManager {
  private client: ChromaClient;
  private openaiApiKey: string;
  private collections: Map<string, Collection> = new Map();

  constructor(config: ChromaDBConfig) {
    const host = config.host || 'localhost';
    const port = config.port || 8000;

    this.client = new ChromaClient({
      path: `http://${host}:${port}`,
    });

    this.openaiApiKey = config.openaiApiKey;
  }

  async getOrCreateCollection(name: string): Promise<Collection> {
    // Check cache
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    try {
      // Try to get existing collection
      const collection = await this.client.getCollection({
        name,
        embeddingFunction: this.getEmbeddingFunction(),
      });

      this.collections.set(name, collection);
      return collection;
    } catch (error) {
      // Collection doesn't exist, create it
      const collection = await this.client.createCollection({
        name,
        embeddingFunction: this.getEmbeddingFunction(),
        metadata: {
          'hnsw:space': 'cosine',
        },
      });

      this.collections.set(name, collection);
      return collection;
    }
  }

  async deleteCollection(name: string): Promise<void> {
    try {
      await this.client.deleteCollection({ name });
      this.collections.delete(name);
    } catch (error) {
      console.warn(`Failed to delete collection ${name}:`, error);
    }
  }

  async listCollections(): Promise<string[]> {
    const collections = await this.client.listCollections();
    return collections.map(c => c.name);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch (error) {
      return false;
    }
  }

  private getEmbeddingFunction(): OpenAIEmbeddingFunction {
    return new OpenAIEmbeddingFunction({
      openai_api_key: this.openaiApiKey,
      openai_model: 'text-embedding-3-small',
    });
  }

  getClient(): ChromaClient {
    return this.client;
  }
}
