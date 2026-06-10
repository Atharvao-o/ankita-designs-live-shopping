import type { TutorialRole } from "@/lib/types";
import type { TutorialStep } from "@/lib/tutorial/types";

const preAuthLandingSteps: TutorialStep[] = [
  {
    id: "landing-role",
    role: "preAuth",
    title: "Choose your path",
    description: "Select Customer to explore exhibitions and shop live, or Vendor to register your business and sell from a stall.",
    targetId: "homepage-role-choice",
    action: "click",
    placement: "bottom"
  },
  {
    id: "landing-register",
    role: "preAuth",
    title: "Start registration",
    description: "Continue with the selected account type. Registration will preselect the customer or vendor path you chose.",
    targetId: "homepage-role-register",
    action: "click",
    placement: "bottom"
  }
];

const preAuthLoginSteps: TutorialStep[] = [
  {
    id: "login-email",
    role: "preAuth",
    title: "Enter your email",
    description: "Use the email connected to your Ankita ExpoVerse account.",
    targetId: "auth-email-input",
    action: "input"
  },
  {
    id: "login-password",
    role: "preAuth",
    title: "Enter your password",
    description: "Authentication errors will still show normally. The guide only continues after a successful login.",
    targetId: "auth-password-input",
    action: "input"
  },
  {
    id: "login-submit",
    role: "preAuth",
    title: "Continue securely",
    description: "Click Continue to sign in. After login, your role-specific guide starts once.",
    targetId: "auth-submit-button",
    action: "click"
  }
];

const preAuthRegisterSteps: TutorialStep[] = [
  {
    id: "register-role",
    role: "preAuth",
    title: "Confirm account type",
    description: "This is preselected from the homepage choice. You can still switch between customer and vendor before submitting.",
    targetId: "auth-role-selector",
    action: "input"
  },
  {
    id: "register-name",
    role: "preAuth",
    title: "Add your name",
    description: "This name is used on your profile and in the experience after login.",
    targetId: "auth-name-input",
    action: "input"
  },
  {
    id: "register-email",
    role: "preAuth",
    title: "Add contact details",
    description: "Enter real account details so your profile can connect to database records.",
    targetId: "auth-email-input",
    action: "input"
  },
  {
    id: "register-password",
    role: "preAuth",
    title: "Set a secure password",
    description: "Passwords are submitted to the backend and stored as one-way hashes.",
    targetId: "auth-password-input",
    action: "input"
  },
  {
    id: "register-confirm",
    role: "preAuth",
    title: "Confirm password",
    description: "Confirm the same password before creating the account.",
    targetId: "auth-confirm-password-input",
    action: "input"
  },
  {
    id: "register-submit",
    role: "preAuth",
    title: "Create account",
    description: "After successful registration, the matching user or vendor guide will start once.",
    targetId: "auth-submit-button",
    action: "click"
  }
];

const userSteps: TutorialStep[] = [
  { id: "user-exhibitions", role: "user", title: "Choose an exhibition", description: "Browse live and upcoming exhibitions from the database.", targetId: "exhibition-list" },
  { id: "user-exhibition-card", role: "user", title: "Open a featured exhibition", description: "Pick a featured exhibition to enter the expo journey.", targetId: "exhibition-card", action: "click" },
  { id: "user-avatar", role: "user", title: "Pick your avatar", description: "Select the persona that represents you inside the exhibition.", targetId: "avatar-selector" },
  { id: "user-avatar-confirm", role: "user", title: "Confirm your avatar", description: "Continue after selecting the avatar you want to use.", targetId: "avatar-confirm-button", action: "click" },
  { id: "user-map", role: "user", title: "Move through the expo", description: "Use movement controls to approach stalls and discover vendors.", targetId: "map-controls" },
  { id: "user-stall", role: "user", title: "Visit a featured stall", description: "Stall cards and map markers represent real generated database stalls.", targetId: "stall-card" },
  { id: "user-live", role: "user", title: "Join the live stream", description: "Enter the vendor live room from the stall when a live session is available.", targetId: "enter-live-room", action: "click" },
  { id: "user-live-video", role: "user", title: "Vendor video", description: "This area shows the vendor livestream or offline state.", targetId: "live-video" },
  { id: "user-live-chat", role: "user", title: "Live chat", description: "Use chat to ask product questions during the stream.", targetId: "live-chat" },
  { id: "user-pinned-product", role: "user", title: "Pinned product", description: "The vendor can highlight one product during the live session.", targetId: "highlighted-product" },
  { id: "user-add-to-cart", role: "user", title: "Add to cart", description: "Add products through the backend cart flow before checkout.", targetId: "add-to-cart" },
  { id: "user-cart", role: "user", title: "Checkout", description: "Open your cart and complete checkout with real backend orders.", targetId: "cart-button" }
];

const vendorSteps: TutorialStep[] = [
  { id: "vendor-status", role: "vendor", title: "Approval status", description: "Your vendor account must be approved before live selling actions unlock.", targetId: "vendor-approval-status" },
  { id: "vendor-products", role: "vendor", title: "Add products", description: "Upload products that can later be pinned and sold in live rooms.", targetId: "vendor-add-product" },
  { id: "vendor-live", role: "vendor", title: "Go live", description: "Start a database-backed live session when your stall and products are ready.", targetId: "vendor-go-live" },
  { id: "vendor-camera", role: "vendor", title: "Camera setup", description: "Use the LiveKit controls for camera, microphone, sharing, and room state.", targetId: "vendor-camera-preview" },
  { id: "vendor-pin", role: "vendor", title: "Highlight products", description: "Pin products during the live session so visitors know what to buy.", targetId: "vendor-pin-product" },
  { id: "vendor-chat", role: "vendor", title: "Reply to chat", description: "Messages persist through the backend live chat flow.", targetId: "vendor-live-chat" },
  { id: "vendor-orders", role: "vendor", title: "Track orders", description: "Vendor orders and analytics come from database order records.", targetId: "vendor-orders" }
];

const adminSteps: TutorialStep[] = [
  { id: "admin-create", role: "admin", title: "Create exhibitions", description: "Create an exhibition and generate real stall records in PostgreSQL.", targetId: "admin-create-exhibition" },
  { id: "admin-stalls", role: "admin", title: "Manage stalls", description: "Assign approved vendors only to generated database stalls.", targetId: "admin-stalls-list" },
  { id: "admin-assign", role: "admin", title: "Assign vendors", description: "Use accepted participation requests to assign vendors to stalls.", targetId: "admin-assign-vendor" },
  { id: "admin-requests", role: "admin", title: "Review vendors", description: "Approve or reject vendor accounts and exhibition participation requests.", targetId: "admin-vendor-requests" },
  { id: "admin-orders", role: "admin", title: "Orders", description: "Review real orders and revenue from the checkout flow.", targetId: "admin-orders" },
  { id: "admin-analytics", role: "admin", title: "Analytics", description: "Use database-backed analytics for visitors, live sessions, orders, and revenue.", targetId: "admin-analytics" },
  { id: "admin-toggle", role: "admin", title: "Tutorial controls", description: "Admins can enable, disable, replay, and reset tutorials for testing.", targetId: "admin-tutorial-toggle" }
];

export function getTutorialSteps(role: TutorialRole, pathname: string): TutorialStep[] {
  if (role === "preAuth") {
    if (pathname.startsWith("/register")) return preAuthRegisterSteps;
    if (pathname.startsWith("/login")) return preAuthLoginSteps;
    return preAuthLandingSteps;
  }
  if (role === "vendor") {
    if (pathname.startsWith("/vendor/products")) return vendorSteps.slice(1, 2);
    if (pathname.startsWith("/vendor/live")) return vendorSteps.slice(2, 6);
    if (pathname.startsWith("/vendor/orders")) return vendorSteps.slice(6);
    return vendorSteps.slice(0, 3);
  }
  if (role === "admin") return adminSteps;
  if (pathname.startsWith("/avatar") || pathname.startsWith("/settings/avatar")) {
    return [];
  }
  if (pathname.startsWith("/exhibition/")) {
    return userSteps.slice(4, 7);
  }
  if (pathname.startsWith("/live/")) {
    return userSteps.slice(7);
  }
  if (pathname.startsWith("/cart") || pathname.startsWith("/checkout")) {
    return userSteps.slice(11);
  }
  return userSteps;
}
