package mobac.mapsources.mappacks.avnavbase;

import org.osgeo.proj4j.*;

public class Main {
    private static final String DEFAULT_CRS="EPSG:4326";
    public static void main(String args[]){
            String mode=args[0];
            String crs=args[1];
            String wkt=null;
            int idx=2;
            if (args[2].startsWith("+")){
                wkt=args[2];
                idx++;
            }
            double x=Double.parseDouble(args[idx]);
            idx++;
            double y=Double.parseDouble(args[idx]);
            System.out.println("creating coordinate transform between "+DEFAULT_CRS+" and "+crs);
            CoordinateTransformFactory ctFactory=new CoordinateTransformFactory();
            CRSFactory csFactory = new CRSFactory();
            CoordinateReferenceSystem src=csFactory.createFromName(DEFAULT_CRS);
            CoordinateReferenceSystem dst=null;
            if (wkt != null){
                System.out.println("using wkt "+wkt);
                dst=csFactory.createFromParameters(crs,wkt);
            }
            else{
                dst=csFactory.createFromName(crs);
            }
            CoordinateTransform trans;
            String txt=null;
            if ("to".equals(mode)) {
                txt="to";
                trans = ctFactory.createTransform(src, dst);
            }
            else{
                txt="from";
                trans = ctFactory.createTransform(dst,src);
            }
        ProjCoordinate p1=new ProjCoordinate(x,y);
        ProjCoordinate p2=new ProjCoordinate();
        trans.transform(p1,p2);
        System.out.println(txt+" "+dst.toString()+" src(x y)="+String.valueOf(x)+
                " "+String.valueOf(y)+
                ", dst(x y)="+String.valueOf(p2.x)+
                " "+String.valueOf(p2.y));
    }
}
