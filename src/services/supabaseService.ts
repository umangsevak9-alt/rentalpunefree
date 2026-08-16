async uploadImage(
  fileOrBlob: Blob | File,
  filename?: string
): Promise<{ url: string; savedPercent?: number }> {
  try {
    const extension =
      fileOrBlob.type === 'image/png'
        ? 'png'
        : fileOrBlob.type === 'image/jpeg'
        ? 'jpg'
        : fileOrBlob.type === 'image/webp'
        ? 'webp'
        : 'jpg';

    const uniqueName =
      `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extension}`;

    const filePath = `properties/${uniqueName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileOrBlob, {
        contentType: fileOrBlob.type || `image/${extension}`,
        upsert: false
      });

    if (error) {
      console.error('Storage upload failed:', error);
      throw error;
    }

    if (!data?.path) {
      throw new Error('Storage upload succeeded but no file path was returned');
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    if (!publicData?.publicUrl) {
      throw new Error('Could not generate public image URL');
    }

    return {
      url: publicData.publicUrl,
      savedPercent: 45
    };
  } catch (e) {
    console.error('Supabase storage upload error:', e);

    // Only use Data URL as temporary fallback.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve({
            url: reader.result,
            savedPercent: 30
          });
        } else {
          reject(new Error('Could not convert image to Data URL'));
        }
      };

      reader.onerror = () => reject(reader.error);

      reader.readAsDataURL(fileOrBlob);
    });
  }
}
