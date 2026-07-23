import * as _radix_ui_react_context from '@radix-ui/react-context';
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

declare const createAlertDialogScope: _radix_ui_react_context.CreateScope;
type DialogProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;
interface AlertDialogProps extends Omit<DialogProps, 'modal'> {
}
declare const AlertDialog: React.FC<AlertDialogProps>;
type DialogTriggerProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>;
interface AlertDialogTriggerProps extends DialogTriggerProps {
}
declare const AlertDialogTrigger: React.ForwardRefExoticComponent<AlertDialogTriggerProps & React.RefAttributes<HTMLButtonElement>>;
type DialogPortalProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>;
interface AlertDialogPortalProps extends DialogPortalProps {
}
declare const AlertDialogPortal: React.FC<AlertDialogPortalProps>;
type DialogOverlayProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>;
interface AlertDialogOverlayProps extends DialogOverlayProps {
}
declare const AlertDialogOverlay: React.ForwardRefExoticComponent<AlertDialogOverlayProps & React.RefAttributes<HTMLDivElement>>;
type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>;
interface AlertDialogContentProps extends Omit<DialogContentProps, 'onPointerDownOutside' | 'onInteractOutside'> {
}
declare const AlertDialogContent: React.ForwardRefExoticComponent<AlertDialogContentProps & React.RefAttributes<HTMLDivElement>>;
type DialogTitleProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;
interface AlertDialogTitleProps extends DialogTitleProps {
}
declare const AlertDialogTitle: React.ForwardRefExoticComponent<AlertDialogTitleProps & React.RefAttributes<HTMLHeadingElement>>;
type DialogDescriptionProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>;
interface AlertDialogDescriptionProps extends DialogDescriptionProps {
}
declare const AlertDialogDescription: React.ForwardRefExoticComponent<AlertDialogDescriptionProps & React.RefAttributes<HTMLParagraphElement>>;
type DialogCloseProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>;
interface AlertDialogActionProps extends DialogCloseProps {
}
declare const AlertDialogAction: React.ForwardRefExoticComponent<AlertDialogActionProps & React.RefAttributes<HTMLButtonElement>>;
interface AlertDialogCancelProps extends DialogCloseProps {
}
declare const AlertDialogCancel: React.ForwardRefExoticComponent<AlertDialogCancelProps & React.RefAttributes<HTMLButtonElement>>;

export { AlertDialogAction as Action, AlertDialog, AlertDialogAction, type AlertDialogActionProps, AlertDialogCancel, type AlertDialogCancelProps, AlertDialogContent, type AlertDialogContentProps, AlertDialogDescription, type AlertDialogDescriptionProps, AlertDialogOverlay, type AlertDialogOverlayProps, AlertDialogPortal, type AlertDialogPortalProps, type AlertDialogProps, AlertDialogTitle, type AlertDialogTitleProps, AlertDialogTrigger, type AlertDialogTriggerProps, AlertDialogCancel as Cancel, AlertDialogContent as Content, AlertDialogDescription as Description, AlertDialogOverlay as Overlay, AlertDialogPortal as Portal, AlertDialog as Root, AlertDialogTitle as Title, AlertDialogTrigger as Trigger, createAlertDialogScope };
