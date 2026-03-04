import { useState, useCallback } from 'react';
import {
    Alert,
    ActionSheetIOS,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import { launchCamera, launchImageLibrary, MediaType, ImagePickerResponse, Asset } from 'react-native-image-picker';
import client from '../api/client';

export interface MediaAttachment {
    uri: string;
    fileName: string;
    type: string;
    fileSize?: number;
    /** Uploaded URL if upload succeeded, null if pending */
    uploadedUrl: string | null;
    /** Local upload state */
    status: 'pending' | 'uploading' | 'uploaded' | 'failed';
}

export interface UseMediaPickerOptions {
    /** Maximum number of attachments allowed */
    maxAttachments?: number;
    /** API endpoint to upload to (e.g., '/system/upload') */
    uploadEndpoint?: string;
    /** Context hints added to the FormData (e.g., { purpose: 'audit-evidence' }) */
    uploadContext?: Record<string, string>;
}

/**
 * MOB-006: Mobile Media Support Hook
 *
 * Provides camera and gallery access for mobile Sales and Audit flows,
 * filling the ABSENT gap identified in the Mobile Architecture Map.
 *
 * Features:
 * - Camera capture and gallery selection
 * - Automatic FormData upload to the backend Cloudinary endpoint
 * - Per-attachment status tracking (pending → uploading → uploaded/failed)
 * - Android permission request handling
 */
export function useMediaPicker(options: UseMediaPickerOptions = {}) {
    const {
        maxAttachments = 5,
        uploadEndpoint = '/system/upload',
        uploadContext = {},
    } = options;

    const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
    const [isPickerVisible, setIsPickerVisible] = useState(false);

    const updateAttachment = useCallback((uri: string, update: Partial<MediaAttachment>) => {
        setAttachments(prev => prev.map(a => a.uri === uri ? { ...a, ...update } : a));
    }, []);

    const uploadAsset = useCallback(async (asset: Asset): Promise<void> => {
        const uri = asset.uri!;
        const fileName = asset.fileName || `attachment_${Date.now()}.jpg`;
        const type = asset.type || 'image/jpeg';

        const newAttachment: MediaAttachment = {
            uri,
            fileName,
            type,
            fileSize: asset.fileSize,
            uploadedUrl: null,
            status: 'pending',
        };

        setAttachments(prev => [...prev, newAttachment]);

        // Begin upload
        updateAttachment(uri, { status: 'uploading' });

        try {
            const formData = new FormData();
            formData.append('file', {
                uri,
                name: fileName,
                type,
            } as any);

            // Attach context fields
            Object.entries(uploadContext).forEach(([key, value]) => {
                formData.append(key, value);
            });

            const response = await client.post(uploadEndpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30000,
            });

            const uploadedUrl = response.data?.secure_url || response.data?.url || response.data;
            updateAttachment(uri, { status: 'uploaded', uploadedUrl });
        } catch (err: any) {
            updateAttachment(uri, { status: 'failed' });
            Alert.alert('Upload Failed', `Could not upload ${fileName}: ${err.message || 'Unknown error'}`);
        }
    }, [uploadEndpoint, uploadContext, updateAttachment]);

    const handlePickerResponse = useCallback(async (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorCode) return;

        const assets = response.assets || [];

        if (attachments.length + assets.length > maxAttachments) {
            Alert.alert('Limit Reached', `You can only attach up to ${maxAttachments} files.`);
            return;
        }

        // Upload all selected assets
        await Promise.all(assets.map(uploadAsset));
    }, [attachments, maxAttachments, uploadAsset]);

    const requestAndroidPermissions = async (): Promise<boolean> => {
        const cameraGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            { title: 'Camera Permission', message: 'Nexus needs camera access to capture evidence.', buttonPositive: 'Allow' }
        );
        const storageGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            { title: 'Storage Permission', message: 'Nexus needs storage access to select photos.', buttonPositive: 'Allow' }
        );
        return cameraGranted === PermissionsAndroid.RESULTS.GRANTED &&
            storageGranted === PermissionsAndroid.RESULTS.GRANTED;
    };

    const openCamera = useCallback(async () => {
        if (Platform.OS === 'android') {
            const ok = await requestAndroidPermissions();
            if (!ok) return;
        }

        const response = await launchCamera({
            mediaType: 'photo' as MediaType,
            quality: 0.8,
            saveToPhotos: false,
        });
        await handlePickerResponse(response);
    }, [handlePickerResponse]);

    const openGallery = useCallback(async () => {
        if (Platform.OS === 'android') {
            const ok = await requestAndroidPermissions();
            if (!ok) return;
        }

        const response = await launchImageLibrary({
            mediaType: 'photo' as MediaType,
            quality: 0.8,
            selectionLimit: Math.max(1, maxAttachments - attachments.length),
        });
        await handlePickerResponse(response);
    }, [handlePickerResponse, maxAttachments, attachments.length]);

    const showPicker = useCallback(() => {
        if (attachments.length >= maxAttachments) {
            Alert.alert('Limit Reached', `Maximum ${maxAttachments} attachments allowed.`);
            return;
        }

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options: ['Cancel', 'Take Photo', 'Choose from Gallery'], cancelButtonIndex: 0 },
                (buttonIndex) => {
                    if (buttonIndex === 1) openCamera();
                    else if (buttonIndex === 2) openGallery();
                }
            );
        } else {
            Alert.alert(
                'Add Attachment',
                'Select source',
                [
                    { text: 'Camera', onPress: openCamera },
                    { text: 'Gallery', onPress: openGallery },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
        }
    }, [attachments.length, maxAttachments, openCamera, openGallery]);

    const removeAttachment = useCallback((uri: string) => {
        setAttachments(prev => prev.filter(a => a.uri !== uri));
    }, []);

    const uploadedUrls = attachments
        .filter(a => a.status === 'uploaded' && a.uploadedUrl)
        .map(a => a.uploadedUrl as string);

    const isUploading = attachments.some(a => a.status === 'uploading');
    const hasFailures = attachments.some(a => a.status === 'failed');

    return {
        attachments,
        showPicker,
        openCamera,
        openGallery,
        removeAttachment,
        uploadedUrls,
        isUploading,
        hasFailures,
    };
}
