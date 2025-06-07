
import { supabase } from "@/integrations/supabase/client";

export const incrementAnalyticsCounter = async () => {
  try {
    // Fetch the existing analytics entry
    const { data: existingCounter, error: fetchError } = await supabase
      .from("analytics")
      .select("*")
      .eq("id", "video_analysis_count")
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    
    if (existingCounter) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from("analytics")
        .update({ 
          value: (existingCounter.value || 0) + 1,
          updated_at: new Date().toISOString() 
        })
        .eq("id", "video_analysis_count");
      
      if (updateError) throw updateError;
    } else {
      // Create new entry if not exists
      const { error: insertError } = await supabase
        .from("analytics")
        .insert({ 
          id: "video_analysis_count", 
          value: 1 
        });
      
      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error("Failed to update analytics:", error);
    throw error;
  }
};
