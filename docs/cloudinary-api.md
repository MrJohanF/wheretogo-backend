# Cloudinary API Documentation

## Delete Image Endpoint

**Endpoint**: `DELETE /admin/cloudinary`

This endpoint deletes an image from Cloudinary storage AND updates the database to remove all references to that image.

### Request Body Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| publicId  | String | Yes      | The Cloudinary public ID of the image to delete |
| imageId   | Number | No       | The database ID of the image if it's in the Image table |
| categoryId| Number | No       | The database ID of the category if the image is attached to a category |

### Examples

#### Delete an image from the Image table:

```json
{
  "publicId": "folder/image_abcdef123",
  "imageId": 42
}
```

#### Delete an image from a Category:

```json
{
  "publicId": "categories/category_image_xyz789",
  "categoryId": 5
}
```

#### Delete an image and all its references:

```json
{
  "publicId": "folder/some_image_ghijk456"
}
```

### Response

#### Success Response

```json
{
  "success": true,
  "message": "Image deleted successfully from Cloudinary and database updated",
  "databaseUpdates": [
    { "type": "image", "id": 42, "success": true },
    { "type": "category", "id": 5, "success": true }
  ]
}
```

#### Success Response with No Database References Found

```json
{
  "success": true,
  "message": "Image deleted successfully from Cloudinary and database updated",
  "databaseUpdates": [
    { "type": "warning", "message": "No database records found matching the publicId" }
  ]
}
```

#### Error Response - Missing PublicId

```json
{
  "success": false,
  "message": "Missing publicId parameter"
}
```

#### Error Response - Cloudinary Deletion Failed

```json
{
  "success": false,
  "message": "Failed to delete image from Cloudinary",
  "details": { ... }
}
```

#### Error Response - Server Error

```json
{
  "success": false,
  "message": "Error message details"
}
```

## How It Works

The improved delete image endpoint now does the following:

1. Deletes the image from Cloudinary using the provided `publicId`
2. Performs multiple database cleanup operations:
   - If `imageId` is provided, it deletes that specific image record
   - If `categoryId` is provided, it nullifies the image reference in that category
   - It searches for any categories that use the given `publicId` and clears their image references
   - It searches for images in the Image table that might have URLs containing the `publicId` and deletes them

This comprehensive approach ensures that all references to the deleted image are properly cleaned up from the database.

## Notes

- You can provide just the `publicId` to perform a thorough cleanup of all references
- For more targeted cleanup, provide the specific `imageId` or `categoryId` along with the `publicId`
- The system will look for the `publicId` in both category records and image URLs
- The response includes detailed information about what database records were updated 

## Extract PublicId from URL Endpoint

**Endpoint**: `POST /admin/cloudinary/extract-publicid`

This endpoint extracts the Cloudinary publicId from a URL. This is useful when you have a Cloudinary URL and need to get the publicId for deletion or other operations.

### Request Body Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| url       | String | Yes      | The Cloudinary URL to extract the publicId from |

### Example

```json
{
  "url": "https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/image_id.jpg"
}
```

### Success Response

```json
{
  "success": true,
  "publicId": "folder/image_id"
}
```

### Error Response - Missing URL

```json
{
  "success": false,
  "message": "Missing url parameter"
}
```

### Error Response - Cannot Extract PublicId

```json
{
  "success": false,
  "message": "Could not extract publicId from the provided URL"
}
```

### Error Response - Server Error

```json
{
  "success": false,
  "message": "Error message details"
}
``` 