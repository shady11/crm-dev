type PlaceholderPageProps = {
    title: string;
    description?: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
    return (
        <div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            {description && (
                <p className="text-muted-foreground">{description}</p>
            )}
        </div>
    );
}