import React from 'react';
import type { Icon as PhosphorIconComponent, IconWeight } from '@phosphor-icons/react';
import {
  WarningCircle,
  Warning,
  ArrowsLeftRight,
  ArrowRight as PhArrowRight,
  BellSimple,
  Briefcase as PhBriefcase,
  Calculator as PhCalculator,
  CalendarBlank,
  Check as PhCheck,
  Checks,
  SealCheck,
  CaretDown,
  CaretLeft,
  CaretRight,
  Clock as PhClock,
  Coffee as PhCoffee,
  Coins as PhCoins,
  SquaresFour,
  Graph,
  Medal,
  Database as PhDatabase,
  DoorOpen as PhDoorOpen,
  DownloadSimple,
  PencilSimpleLine,
  ArrowSquareOut,
  Eye as PhEye,
  EyeSlash,
  FileXls,
  FileText as PhFileText,
  FunnelSimple,
  FolderOpen,
  GraduationCap as PhGraduationCap,
  GridFour,
  Hash as PhHash,
  Heartbeat,
  Question,
  Info as PhInfo,
  Key,
  Stack,
  Kanban,
  ListBullets,
  LockKey,
  SignOut,
  EnvelopeSimpleOpen,
  MapPinLine,
  SidebarSimple,
  MoonStars,
  Plus as PhPlus,
  ArrowsClockwise,
  ArrowCounterClockwise,
  FloppyDisk,
  MagnifyingGlass,
  PaperPlaneTilt,
  SlidersHorizontal,
  Shield as PhShield,
  ShieldWarning,
  ShieldCheck as PhShieldCheck,
  Storefront,
  CheckSquareOffset,
  SunDim,
  Tag as PhTag,
  ThumbsDown as PhThumbsDown,
  ThumbsUp as PhThumbsUp,
  TrashSimple,
  ChartLineUp,
  LockKeyOpen,
  UploadSimple,
  IdentificationBadge,
  UserCheck as PhUserCheck,
  UserPlus as PhUserPlus,
  UserMinus,
  UsersThree,
  UsersFour,
  X as PhX,
  XCircle as PhXCircle,
  Target,
} from '@phosphor-icons/react';

export interface AppIconProps extends Omit<React.SVGAttributes<SVGSVGElement>, 'color'> {
  size?: number | string;
  color?: string;
  weight?: IconWeight;
  strokeWidth?: number | string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

const createPhosphorAdapter = (
  Comp: PhosphorIconComponent,
  defaultWeight: IconWeight = 'duotone'
): React.FC<AppIconProps> => {
  const Adapter: React.FC<AppIconProps> = ({
    size = 18,
    color = 'currentColor',
    weight = defaultWeight,
    strokeWidth: _strokeWidth,
    ...rest
  }) => {
    return <Comp size={size} color={color} weight={weight} {...rest} />;
  };
  return Adapter;
};

export const AlertCircle = createPhosphorAdapter(WarningCircle, 'duotone');
export const AlertTriangle = createPhosphorAdapter(Warning, 'duotone');
export const ArrowLeftRight = createPhosphorAdapter(ArrowsLeftRight, 'bold');
export const ArrowRight = createPhosphorAdapter(PhArrowRight, 'bold');
export const Bell = createPhosphorAdapter(BellSimple, 'duotone');
export const Briefcase = createPhosphorAdapter(PhBriefcase, 'duotone');
export const Calculator = createPhosphorAdapter(PhCalculator, 'duotone');
export const Calendar = createPhosphorAdapter(CalendarBlank, 'duotone');
export const Check = createPhosphorAdapter(PhCheck, 'bold');
export const CheckCheck = createPhosphorAdapter(Checks, 'bold');
export const CheckCircle2 = createPhosphorAdapter(SealCheck, 'duotone');
export const ChevronDown = createPhosphorAdapter(CaretDown, 'bold');
export const ChevronLeft = createPhosphorAdapter(CaretLeft, 'bold');
export const ChevronRight = createPhosphorAdapter(CaretRight, 'bold');
export const Clock = createPhosphorAdapter(PhClock, 'duotone');
export const Coffee = createPhosphorAdapter(PhCoffee, 'duotone');
export const Coins = createPhosphorAdapter(PhCoins, 'duotone');
export const Compass = createPhosphorAdapter(SquaresFour, 'duotone');
export const Cpu = createPhosphorAdapter(Graph, 'duotone');
export const Crown = createPhosphorAdapter(Medal, 'duotone');
export const Database = createPhosphorAdapter(PhDatabase, 'duotone');
export const DoorOpen = createPhosphorAdapter(PhDoorOpen, 'duotone');
export const Download = createPhosphorAdapter(DownloadSimple, 'bold');
export const Edit3 = createPhosphorAdapter(PencilSimpleLine, 'duotone');
export const ExternalLink = createPhosphorAdapter(ArrowSquareOut, 'bold');
export const Eye = createPhosphorAdapter(PhEye, 'duotone');
export const EyeOff = createPhosphorAdapter(EyeSlash, 'duotone');
export const FileSpreadsheet = createPhosphorAdapter(FileXls, 'duotone');
export const FileText = createPhosphorAdapter(PhFileText, 'duotone');
export const Filter = createPhosphorAdapter(FunnelSimple, 'bold');
export const FolderUp = createPhosphorAdapter(FolderOpen, 'duotone');
export const GraduationCap = createPhosphorAdapter(PhGraduationCap, 'duotone');
export const Grid = createPhosphorAdapter(GridFour, 'duotone');
export const Hash = createPhosphorAdapter(PhHash, 'bold');
export const HeartPulse = createPhosphorAdapter(Heartbeat, 'duotone');
export const HelpCircle = createPhosphorAdapter(Question, 'duotone');
export const Info = createPhosphorAdapter(PhInfo, 'duotone');
export const KeyRound = createPhosphorAdapter(Key, 'duotone');
export const Layers = createPhosphorAdapter(Stack, 'duotone');
export const LayoutGrid = createPhosphorAdapter(SquaresFour, 'duotone');
export const Lightbulb = createPhosphorAdapter(Kanban, 'duotone');
export const List = createPhosphorAdapter(ListBullets, 'bold');
export const Lock = createPhosphorAdapter(LockKey, 'duotone');
export const LogOut = createPhosphorAdapter(SignOut, 'bold');
export const Mail = createPhosphorAdapter(EnvelopeSimpleOpen, 'duotone');
export const MapPin = createPhosphorAdapter(MapPinLine, 'duotone');
export const Menu = createPhosphorAdapter(SidebarSimple, 'duotone');
export const Moon = createPhosphorAdapter(MoonStars, 'duotone');
export const Plus = createPhosphorAdapter(PhPlus, 'bold');
export const RefreshCw = createPhosphorAdapter(ArrowsClockwise, 'bold');
export const RotateCcw = createPhosphorAdapter(ArrowCounterClockwise, 'bold');
export const Save = createPhosphorAdapter(FloppyDisk, 'duotone');
export const Search = createPhosphorAdapter(MagnifyingGlass, 'bold');
export const Send = createPhosphorAdapter(PaperPlaneTilt, 'duotone');
export const Settings = createPhosphorAdapter(SlidersHorizontal, 'duotone');
export const Shield = createPhosphorAdapter(PhShield, 'duotone');
export const ShieldAlert = createPhosphorAdapter(ShieldWarning, 'duotone');
export const ShieldCheck = createPhosphorAdapter(PhShieldCheck, 'duotone');
export const ShoppingBag = createPhosphorAdapter(Storefront, 'duotone');
// Replaced generic AI 'Sparkles' 4-pointed star with architectural CheckSquareOffset / Target / Kanban
export const Sparkles = createPhosphorAdapter(CheckSquareOffset, 'duotone');
export const Sun = createPhosphorAdapter(SunDim, 'duotone');
export const Tag = createPhosphorAdapter(PhTag, 'duotone');
export const ThumbsDown = createPhosphorAdapter(PhThumbsDown, 'duotone');
export const ThumbsUp = createPhosphorAdapter(PhThumbsUp, 'duotone');
export const Trash2 = createPhosphorAdapter(TrashSimple, 'duotone');
export const TrendingUp = createPhosphorAdapter(ChartLineUp, 'duotone');
export const Unlock = createPhosphorAdapter(LockKeyOpen, 'duotone');
export const Upload = createPhosphorAdapter(UploadSimple, 'bold');
export const User = createPhosphorAdapter(IdentificationBadge, 'duotone');
export const UserCheck = createPhosphorAdapter(PhUserCheck, 'duotone');
export const UserPlus = createPhosphorAdapter(PhUserPlus, 'duotone');
export const UserX = createPhosphorAdapter(UserMinus, 'duotone');
export const Users = createPhosphorAdapter(UsersThree, 'duotone');
export const Users2 = createPhosphorAdapter(UsersFour, 'duotone');
export const Vote = createPhosphorAdapter(CheckSquareOffset, 'duotone');
export const X = createPhosphorAdapter(PhX, 'bold');
export const XCircle = createPhosphorAdapter(PhXCircle, 'duotone');
export const Zap = createPhosphorAdapter(Target, 'duotone');
