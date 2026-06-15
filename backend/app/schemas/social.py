from typing import Any, Literal

from pydantic import BaseModel, Field


PostType = Literal["product", "offer", "announcement", "live", "event"]
PostStatus = Literal["draft", "published", "archived"]
ModerationStatus = Literal["pending", "approved", "rejected"]


class VendorPublicProfileRead(BaseModel):
    id: str
    vendorId: str
    slug: str
    displayName: str
    bio: str | None = None
    category: str | None = None
    profileImageUrl: str | None = None
    bannerImageUrl: str | None = None
    websiteUrl: str | None = None
    instagramUrl: str | None = None
    whatsapp: str | None = None
    isPublic: bool
    followerCount: int = 0
    postCount: int = 0
    productCount: int = 0
    followingByMe: bool = False
    createdAt: str | None = None
    updatedAt: str | None = None


class VendorPublicProfileUpdate(BaseModel):
    displayName: str | None = Field(default=None, min_length=2, max_length=255)
    slug: str | None = Field(default=None, min_length=2, max_length=180)
    bio: str | None = Field(default=None, max_length=2000)
    category: str | None = Field(default=None, max_length=120)
    profileImageUrl: str | None = Field(default=None, max_length=500)
    bannerImageUrl: str | None = Field(default=None, max_length=500)
    websiteUrl: str | None = Field(default=None, max_length=500)
    instagramUrl: str | None = Field(default=None, max_length=500)
    whatsapp: str | None = Field(default=None, max_length=120)
    isPublic: bool | None = None


class VendorPostCreate(BaseModel):
    postType: PostType = "announcement"
    caption: str = Field(min_length=1, max_length=4000)
    mediaUrls: list[str] = Field(default_factory=list)
    thumbnailUrl: str | None = None
    productId: str | None = None
    stallId: str | None = None
    exhibitionId: str | None = None
    status: PostStatus = "draft"


class VendorPostUpdate(BaseModel):
    postType: PostType | None = None
    caption: str | None = Field(default=None, min_length=1, max_length=4000)
    mediaUrls: list[str] | None = None
    thumbnailUrl: str | None = None
    productId: str | None = None
    stallId: str | None = None
    exhibitionId: str | None = None
    status: PostStatus | None = None


class VendorPostRead(BaseModel):
    id: str
    vendorId: str
    productId: str | None = None
    stallId: str | None = None
    exhibitionId: str | None = None
    postType: str
    caption: str
    mediaUrls: list[str]
    thumbnailUrl: str | None = None
    status: str
    moderationStatus: str
    rejectionReason: str | None = None
    isFeatured: bool
    isPromoted: bool
    publishedAt: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    vendor: VendorPublicProfileRead | None = None
    product: dict[str, Any] | None = None
    likeCount: int = 0
    saveCount: int = 0
    likedByMe: bool = False
    savedByMe: bool = False
    followingVendor: bool = False


class FeedItemRead(VendorPostRead):
    pass


class FeedResponse(BaseModel):
    posts: list[FeedItemRead]
    nextCursor: str | None = None


class FollowStateResponse(BaseModel):
    following: bool
    followerCount: int


class SocialProfileResponse(BaseModel):
    followedVendors: list[VendorPublicProfileRead]
    savedPosts: list[VendorPostRead]
    savedProducts: list[dict[str, Any]]
    counts: dict[str, int]


class AdminPostModerationUpdate(BaseModel):
    rejectionReason: str | None = Field(default=None, max_length=1000)
    value: bool | None = None


class AdminProductModerationUpdate(BaseModel):
    status: Literal["active", "inactive"] | None = None
