import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { homeFaqs } from "@/lib/home-content";

export function FaqSection() {
  return (
    <section id="faq" className="bg-white py-20 sm:py-24">
      <div className="marketing-container">
        <h2 className="heading-display text-center text-[36px] text-ink sm:text-[48px]">
          Questions
        </h2>

        <div className="mx-auto mt-10 max-w-3xl">
          <Accordion className="w-full space-y-3">
            {homeFaqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`faq-${index}`}
                className="rounded-2xl border border-line bg-white px-5 data-open:bg-chip/40"
              >
                <AccordionTrigger className="py-5 text-left text-[16px] font-semibold text-ink hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[15px] leading-relaxed text-body">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
