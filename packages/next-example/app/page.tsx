import { BlogPosts } from 'app/components/posts'

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        Origins of Music
      </h1>
      <p className="mb-4">
        {`Exploring the roots of the music that moves us. From the jazz clubs
        of New Orleans to the warehouses of Chicago, from the block parties of
        the Bronx to the factories of Detroit — every genre has an origin story.
        These are the people, places, and moments that created the sounds we
        can't live without.`}
      </p>
      <div className="my-8">
        <BlogPosts />
      </div>
    </section>
  )
}
