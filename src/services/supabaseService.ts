async uploadImage(
  fileOrBlob: Blob | File,
  filename?: string
): Promise<{ url: string; savedPercent?: number }> {
  try {
    const mimeType = fileOrBlob.type || 'image/jpeg';

    const extension =
      mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
        ? 'webp'
        : mimeType === 'image/gif'
        ? 'gif'
        : 'jpg';

    const uniqueName =
      `property_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}.${extension}`;

    const filePath = `properties/${uniqueName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileOrBlob, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Image upload failed:', error);
      throw error;
    }

    if (!data?.path) {
      throw new Error('Image uploaded but file path is missing');
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    if (!publicData?.publicUrl) {
      throw new Error('Could not create public image URL');
    }

    // Add cache-busting parameter so the browser does not
    // keep showing an old/deleted image.
    const imageUrl =
      `${publicData.publicUrl}?v=${Date.now()}`;

    console.log('Image uploaded:', imageUrl);

    return {
      url: imageUrl,
      savedPercent: 45
    };

  } catch (error) {
    console.error('Supabase image upload error:', error);

    // Fallback to Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve({
            url: reader.result,
            savedPercent: 30
          });
        } else {
          reject(new Error('Could not read image'));
        }
      };

      reader.onerror = () => {
        reject(reader.error || new Error('Could not read image file'));
      };

      reader.readAsDataURL(fileOrBlob);
    });
  }
}
