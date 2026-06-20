# QuizRush Neo-Brutalist Design System

This document outlines the design tokens, classes, and UI guidelines for the QuizRush complete UI replacement and migration.

## Design Tokens

### Colors
These color tokens are defined in the Neo-Brutalist palette:
- **Background**: `#f5fbf4` (Light surface tint)
- **Surface**: `#f5fbf4`
- **Surface Dim**: `#d5dcd5`
- **Surface Container Lowest**: `#ffffff`
- **Surface Container Low**: `#eff5ee`
- **Surface Container**: `#e9f0e9`
- **Surface Container High**: `#e4eae3`
- **Surface Container Highest**: `#dee4dd`
- **On-Surface**: `#171d19`
- **On-Surface-Variant**: `#3d4a42`
- **Primary**: `#006c47`
- **On-Primary**: `#ffffff`
- **Primary Container**: `#5fd69d`
- **On-Primary-Container**: `#005a3a`
- **Primary Fixed**: `#83f9bd`
- **Primary Fixed Dim**: `#65dca3`
- **Secondary**: `#5e5e5e`
- **On-Secondary**: `#ffffff`
- **Secondary Container**: `#e2e2e2`
- **On-Secondary-Container**: `#646464`
- **Electric Blue**: `#2E5BFF`
- **Rocket Orange**: `#FF6720`
- **Sticker Purple**: `#C9A8FF`
- **Emoji Yellow**: `#FFD938`
- **Error Red**: `#FF5050`
- **Outline**: `#6d7a71`
- **Outline Variant**: `#bccabf`

### Border Radii
- **Default**: `0.25rem` (4px)
- **lg**: `0.5rem` (8px)
- **xl**: `0.75rem` (12px)
- **Poster**: `24px`
- **Full**: `9999px`

### Spacing
- **margin-mobile**: `20px`
- **margin-desktop**: `80px`
- **gutter**: `24px`
- **xxl**: `96px`
- **xl**: `64px`
- **lg**: `32px`
- **md**: `16px`
- **sm**: `8px`
- **xs**: `4px`

### Typography (Google Fonts: Anton & Inter)
- **Hero XXL**: `120px` / `0.9` line-height / `Anton`
- **Hero XL**: `80px` / `0.95` line-height / `Anton`
- **Hero XL Mobile**: `56px` / `1.0` line-height / `Anton`
- **Heading LG**: `48px` / `1.1` line-height / `Anton`
- **Heading MD**: `32px` / `1.2` line-height / `Anton`
- **Body LG**: `18px` / `28px` line-height / `500` weight / `Inter`
- **Body MD**: `16px` / `24px` line-height / `500` weight / `Inter`
- **Label Bold**: `14px` / `20px` line-height / `0.05em` letter-spacing / `700` weight / `Inter`
- **Small**: `12px` / `16px` line-height / `600` weight / `Inter`

## Neo-Brutalist Classes & Styles

### Shadows
- **Brutalist Shadow**: `box-shadow: 6px 6px 0px #000;` (Applied on cards, dropdowns, and layouts)
- **Brutalist Shadow SM**: `box-shadow: 4px 4px 0px #000;` (Applied on pills, small buttons)
- **Brutalist Shadow Hover**: `box-shadow: 8px 8px 0px #000; transform: translateY(-2px);` (Applied on interactive items)

### Borders
- **Hard Border**: `border: 4px solid #000;`
- **Thin Border**: `border: 2px solid #000;`

### Backgrounds
- **Pattern BG**: Radial dots grid background.
  ```css
  background-image: radial-gradient(circle at 2px 2px, black 1px, transparent 0);
  background-size: 24px 24px;
  ```

### Animations
- **Sticker Float**:
  ```css
  @keyframes float {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(2deg); }
      100% { transform: translateY(0px) rotate(0deg); }
  }
  ```
- **Confetti Fall**: Fall and rotate effect.

## UI Screens Integrated

1. **Auth Screen**: Clean neo-brutalist authentication pane.
2. **Room Launcher (Lobby Setup)**: Bold choice cards for hosting and joining rooms.
3. **Tabbed Navigation Area**:
   - **Play Tab**: Timer progress, animated options buttons, live распределение votes.
   - **Leagues Tab**: Global Leaderboard with Podium (1st, 2nd, 3rd) and ranking rows.
   - **Analytics Tab**: Brain stats, average response pace bar chart, sticker trophy room.
   - **Valkey Console / Settings**: Active Valkey activity feed showing Hashes, Sets, Sorted Sets, Streams, Pub/Sub, TTL, and Atomic updates, alongside the live feed log.