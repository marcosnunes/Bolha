import { createContext, useContext, useState, useCallback } from 'react';
import { rtdb } from '../firebase/config';
import { ref, push, serverTimestamp, update } from 'firebase/database';
import PropTypes from 'prop-types';

const UploadContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within UploadProvider');
  }
  return context;
}

export function UploadProvider({ children }) {
  const [uploads, setUploads] = useState([]);

  const addUpload = useCallback((uploadData) => {
    const id = Date.now().toString();
    const newUpload = { id, ...uploadData, status: uploadData.status || 'processing', progress: 0 };
    setUploads(prev => [...prev, newUpload]);
    return id;
  }, []);

  const updateUploadProgress = useCallback((id, progress) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, progress } : upload
    ));
  }, []);

  const updateUploadStatus = useCallback((id, status, error = null) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, status, error } : upload
    ));
  }, []);

  const removeUpload = useCallback((id) => {
    setUploads(prev => prev.filter(upload => upload.id !== id));
  }, []);

  const uploadToCloudinary = useCallback((file, uploadId) => {
    return new Promise((resolve, reject) => {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      
      const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      xhr.open('POST', url, true);
      xhr.timeout = resourceType === 'video' ? 600000 : 300000;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          updateUploadProgress(uploadId, percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve({ secure_url: data.secure_url, resource_type: data.resource_type });
        } else {
          try {
            const errorResp = JSON.parse(xhr.responseText);
            reject(new Error(errorResp.error?.message || 'Erro no Cloudinary'));
          } catch {
            reject(new Error('Erro desconhecido no upload.'));
          }
        }
      };

      xhr.onerror = () => {
        if (xhr.status === 0) {
          reject(new Error('Erro de CORS ou rede'));
        } else {
          reject(new Error('Erro de rede'));
        }
      };

      xhr.ontimeout = () => reject(new Error('Upload expirou'));

      xhr.send(formData);
    });
  }, [updateUploadProgress]);

  const createPost = useCallback(async (postData, processedFile, uploadId, currentUser, userProfile) => {
    try {
      updateUploadStatus(uploadId, 'uploading');

      let mediaURL = null;
      let mediaType = null;

      if (processedFile) {
        const uploadResult = await uploadToCloudinary(processedFile, uploadId);
        mediaURL = uploadResult.secure_url;
        mediaType = uploadResult.resource_type;
      }

      updateUploadStatus(uploadId, 'saving');

      const postsRef = ref(rtdb, 'posts');
      const newPostRef = push(postsRef);
      const postId = newPostRef.key;

      const postObj = {
        authorId: currentUser.uid,
        authorNickname: userProfile?.nickname || 'Usuário',
        authorPhotoURL: userProfile?.photoURL || null,
        textContent: postData.textContent || '',
        mediaURL: mediaURL,
        mediaType: mediaType,
        isNSFW: postData.isNSFW || false,
        createdAt: serverTimestamp(),
        likes: {},
        dislikes: {},
        comments: {}
      };

      const updates = {};
      updates[`/posts/${postId}`] = postObj;
      await update(ref(rtdb), updates);

      updateUploadStatus(uploadId, 'completed');
      
      // Remove após 3 segundos
      setTimeout(() => removeUpload(uploadId), 3000);

      return postId;
    } catch (error) {
      updateUploadStatus(uploadId, 'error', error.message);
      throw error;
    }
  }, [uploadToCloudinary, updateUploadStatus, removeUpload]);

  const value = {
    uploads,
    addUpload,
    updateUploadProgress,
    updateUploadStatus,
    removeUpload,
    createPost
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
}

UploadProvider.propTypes = {
  children: PropTypes.node.isRequired
};
