/**
 * Lagu icon set
 * =============
 *
 * This folder is the single place to customise icons. Each export below is a
 * small component that takes `IconProps`. To change an icon:
 *
 *   1. Swap the glyph name (any Material Symbols name works), e.g.
 *        export const PlayIcon = (p: IconProps) => <Icon name="play_circle" filled {...p} />
 *   2. Or return your own SVG, e.g.
 *        export const PlayIcon = (p: IconProps) => <svg {...svgProps(p)}>…</svg>
 *
 * `Icon`/`IconProps` are re-exported so custom icons can reuse them.
 */
import tuxUrl from '@/assets/tux.svg'
import { Icon, type IconProps } from './Icon'

export { Icon, type IconProps } from './Icon'

// --- Playback -------------------------------------------------------------
/** Rounded play triangle (custom SVG - rounded corners, slightly larger). */
export const PlayIcon = ({ size = 18, className, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    style={style}
    fill="currentColor"
    aria-hidden
  >
    <path
      d="M9.4 6.4v11.2L18.4 12z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="3.6"
      strokeLinejoin="round"
    />
  </svg>
)

/** Rounded pause bars (custom SVG). */
export const PauseIcon = ({ size = 18, className, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    style={style}
    fill="currentColor"
    aria-hidden
  >
    <rect x="5.8" y="4.6" width="4.8" height="14.8" rx="2.4" />
    <rect x="13.4" y="4.6" width="4.8" height="14.8" rx="2.4" />
  </svg>
)

export const StopIcon = (p: IconProps) => <Icon name="stop" filled {...p} />
export const PrevIcon = (p: IconProps) => <Icon name="skip_previous" filled {...p} />
export const NextIcon = (p: IconProps) => <Icon name="skip_next" filled {...p} />
export const ShuffleIcon = (p: IconProps) => <Icon name="shuffle" {...p} />
export const RepeatIcon = (p: IconProps) => <Icon name="repeat" {...p} />
export const RepeatOneIcon = (p: IconProps) => <Icon name="repeat_one" {...p} />
export const QueueIcon = (p: IconProps) => <Icon name="queue_music" {...p} />
export const PlaylistIcon = (p: IconProps) => <Icon name="playlist_play" {...p} />
export const GraphicEqIcon = (p: IconProps) => <Icon name="graphic_eq" {...p} />
export const AnimationIcon = (p: IconProps) => <Icon name="animation" {...p} />
export const MotionIcon = (p: IconProps) => <Icon name="motion_photos_on" {...p} />

// --- Volume ---------------------------------------------------------------
export const VolumeIcon = (p: IconProps) => <Icon name="volume_up" {...p} />
export const VolumeMuteIcon = (p: IconProps) => <Icon name="volume_off" {...p} />

// --- Navigation -----------------------------------------------------------
export const LibraryIcon = (p: IconProps) => <Icon name="library_music" {...p} />
export const LibraryMusicIcon = (p: IconProps) => <Icon name="library_music" {...p} />
export const DiscIcon = (p: IconProps) => <Icon name="album" {...p} />
export const AlbumIcon = (p: IconProps) => <Icon name="album" {...p} />
export const ArtistIcon = (p: IconProps) => <Icon name="person" {...p} />
export const FolderIcon = (p: IconProps) => <Icon name="folder" {...p} />
export const CreateFolderIcon = (p: IconProps) => <Icon name="create_new_folder" {...p} />
export const SettingsIcon = (p: IconProps) => <Icon name="settings" {...p} />
export const SidebarIcon = (p: IconProps) => <Icon name="view_sidebar" {...p} />
export const LayersIcon = (p: IconProps) => <Icon name="layers" {...p} />
export const ChevronLeftIcon = (p: IconProps) => <Icon name="chevron_left" {...p} />
export const SwapVertIcon = (p: IconProps) => <Icon name="swap_vert" {...p} />

// --- Actions --------------------------------------------------------------
export const PlusIcon = (p: IconProps) => <Icon name="add" {...p} />
export const CloseIcon = (p: IconProps) => <Icon name="close" {...p} />
export const CheckIcon = (p: IconProps) => <Icon name="check" {...p} />
export const EditIcon = (p: IconProps) => <Icon name="edit" {...p} />
export const TrashIcon = (p: IconProps) => <Icon name="delete" {...p} />
export const RemoveCircleIcon = (p: IconProps) => <Icon name="remove_circle_outline" {...p} />
export const RefreshIcon = (p: IconProps) => <Icon name="refresh" {...p} />
export const SearchIcon = (p: IconProps) => <Icon name="search" {...p} />
export const SortIcon = (p: IconProps) => <Icon name="sort" {...p} />
export const PinIcon = (p: IconProps) => <Icon name="push_pin" {...p} />
export const GripIcon = (p: IconProps) => <Icon name="drag_indicator" {...p} />
export const LinkIcon = (p: IconProps) => <Icon name="link" {...p} />
export const ImageIcon = (p: IconProps) => <Icon name="image" {...p} />
export const CloudDownloadIcon = (p: IconProps) => <Icon name="cloud_download" {...p} />
export const WifiIcon = (p: IconProps) => <Icon name="wifi" {...p} />
export const WarningIcon = (p: IconProps) => <Icon name="warning" {...p} />

// --- Interface ------------------------------------------------------------
export const FullscreenIcon = (p: IconProps) => <Icon name="fullscreen" {...p} />
export const FullscreenExitIcon = (p: IconProps) => <Icon name="fullscreen_exit" {...p} />
export const KeyboardIcon = (p: IconProps) => <Icon name="keyboard" {...p} />
export const PaletteIcon = (p: IconProps) => <Icon name="palette" {...p} />
export const TextFieldsIcon = (p: IconProps) => <Icon name="text_fields" {...p} />
export const ZoomInIcon = (p: IconProps) => <Icon name="zoom_in" {...p} />
export const ZoomOutIcon = (p: IconProps) => <Icon name="zoom_out" {...p} />

// --- Lyrics ---------------------------------------------------------------
export const LyricsIcon = (p: IconProps) => <Icon name="lyrics" {...p} />
export const LyricsImportIcon = (p: IconProps) => <Icon name="upload_file" {...p} />
export const LyricsRemoveIcon = (p: IconProps) => <Icon name="subtitles_off" {...p} />

// --- Website additions ----------------------------------------------------
export const DownloadIcon = (p: IconProps) => <Icon name="download" {...p} />
export const MusicIcon = (p: IconProps) => <Icon name="music_note" {...p} />
export const VerifiedIcon = (p: IconProps) => <Icon name="check_circle" {...p} />
export const WindowsIcon = (p: IconProps) => <Icon name="desktop_windows" {...p} />
export const AppleIcon = (p: IconProps) => <Icon name="laptop_mac" {...p} />
/** Tux - the official mascot art (Tux.svg, public domain, via Wikimedia). */
export const LinuxIcon = ({ size = 18, className, style }: IconProps) => (
  <img
    src={tuxUrl}
    alt=""
    aria-hidden
    draggable={false}
    className={className}
    style={{ height: size, width: 'auto', display: 'block', ...style }}
  />
)
export const BoltIcon = (p: IconProps) => <Icon name="bolt" {...p} />
export const ShieldIcon = (p: IconProps) => <Icon name="shield" {...p} />
export const CodeIcon = (p: IconProps) => <Icon name="code" {...p} />
export const DevicesIcon = (p: IconProps) => <Icon name="devices" {...p} />
export const SparkleIcon = (p: IconProps) => <Icon name="auto_awesome" {...p} />
export const PersonIcon = (p: IconProps) => <Icon name="person" {...p} />
export const TextIcon = (p: IconProps) => <Icon name="text_fields" {...p} />
export const TerminalIcon = (p: IconProps) => <Icon name="terminal" {...p} />
