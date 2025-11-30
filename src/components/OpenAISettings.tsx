import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Key, Bot, CheckCircle } from "lucide-react";

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export default function OpenAISettings() {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState<OpenAIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [savedApiKey, setSavedApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("key", "openai_model")
        .maybeSingle();

      if (error) throw error;

      if (data?.value && typeof data.value === 'object' && 'model' in data.value) {
        const settings = data.value as { model: string };
        setSelectedModel(settings.model);
        setSavedApiKey(true);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const fetchModels = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key first");
      return;
    }

    setFetchingModels(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-openai-models", {
        body: { apiKey }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setModels(data.models || []);
      setSavedApiKey(true);
      toast.success(`Found ${data.models?.length || 0} available models`);
    } catch (error: any) {
      toast.error("Failed to fetch models: " + error.message);
    } finally {
      setFetchingModels(false);
    }
  };

  const saveSettings = async () => {
    if (!selectedModel) {
      toast.error("Please select a model");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save the selected model
      const { error: settingsError } = await supabase
        .from("platform_settings")
        .upsert({
          key: "openai_model",
          value: { model: selectedModel, apiKey: apiKey },
          updated_by: user.id
        }, {
          onConflict: "key"
        });

      if (settingsError) throw settingsError;

      toast.success("OpenAI settings saved successfully");
    } catch (error: any) {
      toast.error("Failed to save settings: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>OpenAI API Configuration</CardTitle>
            <CardDescription>Configure OpenAI API key and select a model</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              OpenAI API Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={fetchModels} 
                disabled={fetchingModels || !apiKey.trim()}
                variant="outline"
              >
                {fetchingModels ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  "Fetch Models"
                )}
              </Button>
            </div>
            {savedApiKey && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                API key configured
              </p>
            )}
          </div>

          {models.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="model">Select Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Choose a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {models.length} model{models.length !== 1 ? 's' : ''} available
              </p>
            </div>
          )}

          <Button 
            onClick={saveSettings} 
            disabled={loading || !selectedModel}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>

        {selectedModel && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm font-medium mb-1">Currently Selected Model:</p>
            <p className="text-sm text-muted-foreground font-mono">{selectedModel}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
