type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-7">
      <h1 className="font-heading text-[30px] font-bold tracking-tight text-ink">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-body">
          {description}
        </p>
      ) : null}
    </div>
  );
}
