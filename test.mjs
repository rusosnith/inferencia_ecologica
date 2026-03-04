import { WebR } from 'webr';
const webr = new WebR();
(async () => {
    try {
        await webr.init();
        await webr.evalRVoid(`
            install.packages('eiPack', repos='https://cloud.r-project.org')
            library(eiPack)
            # Create dummy data
            df = data.frame(n=c(100,100), x1=c(0.8,0.2), x2=c(0.2,0.8), t1=c(0.7,0.1), t2=c(0.3,0.9))
            f = cbind(t1, t2) ~ cbind(x1, x2)
            out = ei.MD.bayes(f, data=df, total='n', burnin=50, sample=50, thin=1)
            print(names(apply(out$draws$Beta, 2, mean)))
        `);
    } catch(e) { console.error(e) }
    process.exit(0);
})();
