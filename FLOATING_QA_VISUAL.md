# 💬 Floating QA Chat - Visual Guide

## Layout

### Closed State (Button Only)
```
┌─────────────────────────────────────────┐
│                                         │
│  [Main Content Area]                    │
│                                         │
│                                         │
│                                         │
│                                    [🔵] │  ← Floating button
│                                         │    (bottom-right)
└─────────────────────────────────────────┘
```

### Open State (Chat Window)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Main Content Area]      ┌───────────────────────────────┐│
│                           │ 💬 Ask Questions          [X] ││
│                           ├───────────────────────────────┤│
│                           │ Ask about:                    ││
│                           │ [Select Document ▼]          ││
│                           ├───────────────────────────────┤│
│                           │                               ││
│                           │ User: Hey, what is...?        ││
│                           │ [blue msg - right aligned]    ││
│                           │                               ││
│                           │ Assistant: Based on your...   ││
│                           │ [white msg - left aligned]    ││
│                           │                               ││
│                           │ User: Can you explain...?     ││
│                           │                               ││
│                           ├───────────────────────────────┤│
│                           │ Clear chat                    ││
│                           │ [Type message...]  [Send]     ││
│                           └───────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Button Styling

### Closed (Idle)
```
    ┌─────────┐
    │    💬   │  • Gradient: indigo → purple
    │ (circle)│  • Size: 56×56px (14rem)
    └─────────┘  • Border-radius: full
                 • Shadow: lg
                 • Position: fixed bottom-6 right-6
```

### Closed (Hover)
```
    ╔═════════╗
    ║    💬   ║  • Scale up (hover:scale-110)
    ║ (circle)║  • Enhanced shadow (hover:shadow-xl)
    ╚═════════╝  • Smooth transition
```

### Open
```
    Chat window visible instead of button
```

## Chat Window Components

### Header
```
┌─────────────────────────────────┐
│ 💬 Ask Questions            [X] │  • Gradient background
│                                 │  • White text
└─────────────────────────────────┘  • Full width
                                      • Rounded top corners
```

### Document Selector
```
┌─────────────────────────────────┐
│ Ask about:                      │
│ ┌───────────────────────────────┤
│ │ Summary: The Last Lightkeeper ▼
│ └───────────────────────────────┤
└─────────────────────────────────┘
• Only shown if cards exist
• Dropdown select
• Card titles truncated at 40 chars
```

### Message Bubble - User
```
                    ┌──────────────────────┐
                    │ Hey, what is this... │  • Indigo background
                    │ 2:45 PM              │  • White text
                    └──────────────────────┘  • Right aligned
                                              • Timestamp below
                                              • Rounded except BR
```

### Message Bubble - Assistant
```
┌──────────────────────────────────┐
│ Based on the document, this is... │  • White background
│ 2:46 PM                          │  • Gray border
└──────────────────────────────────┘  • Left aligned
                                       • Timestamp below
                                       • Rounded except BL
```

### Empty State
```
┌─────────────────────────────────┐
│                                 │
│         💬 (faded)              │  • Large icon
│    Start a conversation         │  • Help text
│ Ask questions about your cards  │  • Centered
│                                 │
└─────────────────────────────────┘
```

### Messages Area (Scrollable)
```
┌─────────────────────────────────┐
│ User: What is machine learning? │
│ 2:40 PM                         │
│                                 │
│ Assistant: ML is a subset of... │
│ 2:41 PM                         │
│                                 │
│ User: Can you give examples?    │
│ 2:42 PM                         │
│                                 │
│ Assistant: Sure! Examples incl..│
│ 2:43 PM                         │
│                                 │
└─────────────────────────────────┘
```

### Input Area
```
┌─────────────────────────────────┐
│ Clear chat                      │  • Optional (shown if messages)
├─────────────────────────────────┤
│ [Type your question...] [Send] 🔄│  • Input field + button
└─────────────────────────────────┘  • Loading spinner on send
```

## Dimensions & Spacing

```
Floating Button:
├─ Width: 56px (w-14)
├─ Height: 56px (h-14)
├─ Position: bottom-6 right-6 (24px from edges)
└─ Icon size: 24px (w-6 h-6)

Chat Window:
├─ Width: 384px (w-96)
├─ Height: 600px (h-[600px])
├─ Position: bottom-6 right-6 (same as button)
├─ Max width: 384px (w-96)
└─ Border radius: 16px (rounded-2xl)

Header:
├─ Padding: 16px (p-4)
├─ Height: ~60px
└─ Border radius: 16px top, 0 bottom

Document Selector:
├─ Padding: 12px (p-3)
├─ Background: gray-50
├─ Border: 1px gray-300
└─ Border radius: 8px (rounded-lg)

Message Bubbles:
├─ Max width: 288px (max-w-xs)
├─ Padding: 16px (px-4 py-2)
├─ Border radius: 8px
├─ User: No bottom-right radius (rounded-br-none)
└─ Assistant: No bottom-left radius (rounded-bl-none)

Input Area:
├─ Padding: 16px (p-4)
├─ Gap: 8px (gap-2)
├─ Button size: 32px height
└─ Border radius: 8px (rounded-lg)
```

## Colors & Styling

### Gradients
```
Button & Header:
from-indigo-600 (top/left)
to-purple-600 (bottom/right)

Progress/Active:
bg-indigo-600
```

### Text Colors
```
Primary: text-gray-900
Secondary: text-gray-600
Tertiary: text-gray-500
Timestamp: text-xs opacity-70

Error/Alert: text-rose-600
Hover: text-gray-900 (darker on hover)
```

### Background Colors
```
Chat Window: bg-white
Messages Area: bg-gray-50
User Messages: bg-indigo-600
Assistant Messages: bg-white
Selector: bg-gray-50
Input: bg-white
Button Hover: opacity-50 on disabled
```

### Borders & Shadows
```
Chat Window:
└─ border-gray-200 (1px)
└─ shadow-2xl

Messages:
└─ border-gray-200 (1px, only on assistant)

Buttons:
└─ border-gray-300 (on input)

Shadows:
├─ Button: shadow-lg, hover:shadow-xl
└─ Window: shadow-2xl
```

## Responsive Behavior

### Desktop (≥1024px)
```
┌─────────────────────────────────────────────────┐
│ [Main Content - Full Width]                  [💬]│
│                             ┌───────────────────┐│
│                             │ Chat Window (384px)││
│                             │ - Full height chat│
│                             │ - No size limit   │
│                             └───────────────────┘│
└─────────────────────────────────────────────────┘
```

### Tablet (768px - 1023px)
```
┌──────────────────────────────────────┐
│ [Content - Most Width]           [💬]│
│                    ┌────────────────┐│
│                    │ Chat (384px)   ││
│                    │ Scrolls if tall││
│                    └────────────────┘│
└──────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌─────────────────────┐
│ [Mobile Content] [💬]
│  ┌───────────────┐
│  │ Chat Window   │
│  │ (may cover)   │
│  │ (scrollable)  │
│  └───────────────┘
└─────────────────────┘
```

## Animations & Transitions

### Button
```
Idle → Hover:
├─ Scale: scale-100 → scale-110
├─ Shadow: shadow-lg → shadow-xl
├─ Duration: smooth (transition-all)
└─ Timing: instant

Closed → Open:
└─ Fade in chat window
  (instant, controlled by isOpen state)
```

### Chat Window
```
Open:
├─ Enter: fade in + slide up
├─ Exit: fade out
└─ All transitions: smooth

Messages:
├─ New message appears with space-4 gap
├─ Auto-scroll: smooth behavior
└─ Timestamps: fade in with message
```

### Loading Spinner
```
Spinner Icon:
├─ Icon: <Loader />
├─ Animation: animate-spin
├─ Speed: Default (1s per rotation)
└─ Color: Current color (white/indigo)
```

## State Indicators

### Disabled State (During API Call)
```
Input Field:
├─ bg-gray-100 (dimmed)
├─ cursor-not-allowed
└─ opacity reduced

Send Button:
├─ opacity-50
├─ cursor-not-allowed
├─ Shows spinner
└─ Cannot be clicked
```

### Error State
```
Message appears as assistant message:
┌────────────────────────────────┐
│ Failed to get answer.          │
│ Please try again.              │  • Red-ish tone (error)
│ 2:45 PM                        │  • Still left-aligned
└────────────────────────────────┘  • Same styling as answer
```

## Z-Index Stack

```
100 - Floating Button (closed)
200 - Chat Window (open)
300 - Chat overlay (if ever needed)
```

---

## Example Conversation

```
┌─────────────────────────────────────────────┐
│ 💬 Ask Questions                        [X] │
├─────────────────────────────────────────────┤
│ Ask about:                                  │
│ [Summary: Machine Learning Basics ▼]       │
├─────────────────────────────────────────────┤
│                                             │
│                 What is ML?                 │
│               [2:40 PM]                     │
│                                             │
│ ML is a subset of artificial               │
│ intelligence that enables systems...        │
│                 [2:41 PM]                   │
│                                             │
│           Can you give examples?            │
│               [2:42 PM]                     │
│                                             │
│ Certainly! Common examples include:        │
│ • Email spam filtering                      │
│ • Recommendation systems                    │
│ • Image recognition                        │
│ • Virtual assistants                       │
│                 [2:43 PM]                   │
│                                             │
├─────────────────────────────────────────────┤
│ Clear chat                                  │
│ [Type another question...] [Send]           │
└─────────────────────────────────────────────┘
```

---

This floating chat provides a clean, intuitive interface for asking questions about documents without leaving the current page!
