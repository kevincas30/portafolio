import { useEffect, useMemo, useState } from 'react';

type Project = { slug: string; title: string; summary: string; category: string; cover: string; coverAlt: string; isDemo: boolean };

export default function PortfolioExplorer({ projects }: { projects: Project[] }) {
  const filters = useMemo(() => ['Todos', ...['Web', 'Diseño para redes', 'Vídeo'].filter(category => projects.some(project => project.category === category))], [projects]);
  const [active, setActive] = useState('Todos');
  useEffect(() => {
    const url = new URL(window.location.href);
    const initial = url.searchParams.get('tipo') || 'Todos';
    setActive(filters.includes(initial) ? initial : 'Todos');
    if (!filters.includes(initial)) {
      url.searchParams.delete('tipo');
      history.replaceState({}, '', url);
    }
  }, [filters]);
  const shown = useMemo(() => active === 'Todos' ? projects : projects.filter((project) => project.category === active), [active, projects]);
  const select = (filter: string) => {
    setActive(filter);
    const url = new URL(window.location.href);
    if (filter === 'Todos') url.searchParams.delete('tipo'); else url.searchParams.set('tipo', filter);
    history.replaceState({}, '', url);
  };
  return <>
    <div className="filters" role="group" aria-label="Filtrar proyectos">
      {filters.map((filter) => <button key={filter} className="filter-button" type="button" aria-pressed={active === filter} onClick={() => select(filter)}>{filter}</button>)}
    </div>
    <p aria-live="polite"><strong>{shown.length}</strong> {shown.length === 1 ? 'proyecto' : 'proyectos'}</p>
    <div className="portfolio-grid">
      {shown.map((project) => <article className="portfolio-item" key={project.slug}>
        <a href={`/proyectos/${project.slug}`}>
          <img src={project.cover} alt={project.coverAlt} width="1400" height="900" loading="lazy" />
          <div className="project-tags" style={{ marginTop: '.8rem' }}>
            {project.isDemo && <span className="label demo-label">Concepto</span>}<span className="label">{project.category}</span>
          </div>
          <h2>{project.title}</h2><p>{project.summary}</p><span className="arrow-link">Ver proyecto <span aria-hidden="true">→</span></span>
        </a>
      </article>)}
      {!shown.length && <div className="empty-state"><h2>No hay proyectos en este filtro todavía.</h2><button className="button" type="button" onClick={() => select('Todos')}>Ver todos</button></div>}
    </div>
  </>;
}
