import * as React from 'react';

declare const mergeProps: <SlotProps extends AnyProps = AnyProps, ChildProps extends AnyProps = SlotProps, ReturnProps extends AnyProps = SlotProps & ChildProps>(slotProps: SlotProps, childProps: ChildProps) => ReturnProps;
interface MergePropsFunction<SlotProps extends AnyProps = UnknownProps, ChildProps extends AnyProps = SlotProps, ReturnProps extends AnyProps = SlotProps & ChildProps> {
    (slotProps: SlotProps, childProps: ChildProps): ReturnProps;
}
type AnyProps = Record<string, any>;
type UnknownProps = Record<string, unknown>;

interface SlotProviderProps {
    children: React.ReactNode;
    mergeProps: MergePropsFunction<AnyProps, AnyProps, AnyProps>;
}
declare const SlotProvider: React.FC<SlotProviderProps>;
type SlotProps<Elem extends Element = HTMLElement, Props = React.HTMLAttributes<Elem>> = Props & {
    children?: React.ReactNode;
    mergeProps?: MergePropsFunction;
};
declare function createSlot<Elem extends Element = HTMLElement, Props = React.HTMLAttributes<Elem>>(ownerName: string): React.ForwardRefExoticComponent<React.PropsWithoutRef<SlotProps<Elem, Props>> & React.RefAttributes<Elem>>;
declare const Slot: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLElement> & {
    children?: React.ReactNode;
    mergeProps?: MergePropsFunction;
} & React.RefAttributes<HTMLElement>>;
type SlottableChildrenProps = {
    children: React.ReactNode;
};
type SlottableRenderFnProps = {
    child: React.ReactNode;
    children: (slottable: React.ReactNode) => React.ReactNode;
};
type SlottableProps = SlottableRenderFnProps | SlottableChildrenProps;
interface SlottableComponent extends React.FC<SlottableProps> {
    __radixId: symbol;
}
declare function createSlottable(ownerName: string): SlottableComponent;
declare const Slottable: SlottableComponent;

export { type MergePropsFunction, SlotProvider as Provider, Slot as Root, Slot, type SlotProps, SlotProvider, Slottable, createSlot, createSlottable, mergeProps };
