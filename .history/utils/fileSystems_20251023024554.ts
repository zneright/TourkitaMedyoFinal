import * as FileSystem from 'expo-file-system';

/**
 * The single, shared directory for all downloadable assets.
 */
export const SHARED_ASSETS_DIR = FileSystem.documentDirectory + 'shared_assets/';

/**
 * A helper to get a clean filename from any URL.
 */
export const getFilenameFromUrl = (url) => {
    if (!url) return '';
    return decodeURIComponent(url.split('/').pop().split('?')[0]);
};

/**
 * A helper to create a filesystem-safe directory name from a landmark title.
 */
export const getSafeDirName = (name) => {
    if (!name) return 'default';
    return name.replace(/[^a-zA-Z0-9]/g, '_');
};