# Social Shopping Stabilization QA Checklist

Use production-like accounts and real database records. Record the tested URL, account, result, and any screenshot or log reference for each failure.

## Test Environment

- [ ] Frontend URL recorded:
- [ ] Backend URL recorded:
- [ ] Backend `/health` returns `200`
- [ ] Backend `/docs` opens
- [ ] Social table check script passes
- [ ] Browser console has no blocking errors
- [ ] Backend logs have no unhandled exceptions

## Guest

- [ ] Open `/`
- [ ] Social feed loads real approved posts or the existing product fallback
- [ ] Advertisement carousel still loads
- [ ] Open `/explore`
- [ ] Open `/v/[vendorSlug]`
- [ ] Open `/p/[postId]`
- [ ] Open `/product/[productId]`
- [ ] Missing post shows a clear not-found state
- [ ] Missing vendor shows a clear not-found state
- [ ] Follow routes to login
- [ ] Like routes to login
- [ ] Save post routes to login
- [ ] Save product routes to login

## Customer

- [ ] Login as customer
- [ ] Follow an approved vendor
- [ ] Refresh vendor page and confirm following state
- [ ] Unfollow vendor
- [ ] Like an approved post
- [ ] Refresh post/feed and confirm liked state
- [ ] Unlike post
- [ ] Save an approved post
- [ ] Unsave post
- [ ] Save an active product
- [ ] Refresh product page and confirm saved state
- [ ] Unsave product
- [ ] Open `/profile`
- [ ] Followed vendors appear
- [ ] Saved posts appear
- [ ] Saved products appear
- [ ] Add product to cart
- [ ] Cart totals and quantity controls still work
- [ ] Checkout behaves as before
- [ ] Orders load

## Pending Vendor

- [ ] Login as pending vendor
- [ ] Open `/vendor/profile`
- [ ] Edit and save public profile
- [ ] Public `/v/[vendorSlug]` remains unavailable
- [ ] Create a draft post
- [ ] Attempt to publish post
- [ ] Clear vendor approval blocking message appears

## Approved Vendor

- [ ] Login as approved vendor
- [ ] Open `/vendor/profile`
- [ ] Edit display name, bio, category, and slug
- [ ] Upload profile image
- [ ] Upload banner image
- [ ] Save profile
- [ ] Public vendor profile displays updated values
- [ ] Open `/vendor/posts`
- [ ] Create draft post
- [ ] Link an owned product
- [ ] Upload post media
- [ ] Submit post for moderation
- [ ] Pending moderation status appears
- [ ] Archive post
- [ ] Vendor cannot link another vendor's product or stall

## Admin

- [ ] Login as admin
- [ ] Open `/admin/feed`
- [ ] Filter pending posts
- [ ] Approve post
- [ ] Approved post appears publicly
- [ ] Reject post with a reason
- [ ] Rejection reason appears to vendor
- [ ] Rejected post does not appear publicly
- [ ] Feature post
- [ ] Unfeature post
- [ ] Promote post
- [ ] Unpromote post
- [ ] Open `/admin/products`
- [ ] Hide product using status control
- [ ] Hidden product does not appear in public product APIs
- [ ] Restore product to active
- [ ] Existing vendor approval still works
- [ ] Existing exhibitions still work
- [ ] Existing stalls still work
- [ ] Existing orders still work

## Live Regression

- [ ] `/live/[stallId]` opens
- [ ] `/vendor/live` opens
- [ ] LiveKit connection behavior is unchanged
- [ ] Chat is unchanged
- [ ] Bargain flow is unchanged
- [ ] Pinned product behavior is unchanged

## Theme And Responsive

- [ ] Homepage light mode
- [ ] Homepage dark mode
- [ ] Explore light mode
- [ ] Explore dark mode
- [ ] Post detail light mode
- [ ] Post detail dark mode
- [ ] Vendor profile light mode
- [ ] Vendor profile dark mode
- [ ] Customer profile light mode
- [ ] Customer profile dark mode
- [ ] Vendor pages light mode
- [ ] Vendor pages dark mode
- [ ] Admin pages light mode
- [ ] Admin pages dark mode
- [ ] Mobile width around 360px
- [ ] Mobile width around 430px
- [ ] Tablet width around 768px
- [ ] Desktop width 1280px or wider
- [ ] Mobile bottom navigation does not cover CTAs or form controls
- [ ] Focus states are visible
- [ ] Loading, empty, error, disabled, and success states are readable
