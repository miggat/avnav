package mobac.mapsources.mappacks.avnavbase;

import java.util.ArrayList;
import java.util.HashMap;

import javax.xml.bind.Unmarshaller;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlElementWrapper;
import javax.xml.bind.annotation.XmlElements;
import javax.xml.bind.annotation.XmlRootElement;

import mobac.mapsources.MapSourceTools;
import org.apache.log4j.Logger;
import org.osgeo.proj4j.*;

/**
 * extend the CustomWmsMapSource by some features...
 */
@XmlRootElement
public class ExCustomWmsMapSource extends ExCustomMapSource {
	private Logger log = Logger.getLogger(ExCustomWmsMapSource.class);

	private static final String DEFAULT_CRS="EPSG:4326";
	public static class LayerMapping{
		public String zoom;
		public String layers;
	}
	
	/**
	 * tested with 1.1.1, but should work with other versions
	 */
	@XmlElement(required = true, name = "version")
	private String version = "1.1.1";

	/**
	 * no spaces allowed, must be replaced with %20 in the url
	 */
	@XmlElement(required = true, name = "layers")
	private String layers = "";

	/**
	 * currently only the coordinate system epsg:4326 is supported
	 */
	@XmlElement(required = true, name = "coordinatesystem", defaultValue = DEFAULT_CRS)
	private String coordinatesystem = DEFAULT_CRS;

	/**
	 * some wms needs more parameters: &amp;EXCEPTIONS=BLANK&amp;Styles= .....
	 */
	@XmlElement(required = false, name = "aditionalparameters")
	private String aditionalparameters = "";

	/**
	 * maybe we have an unknown CRS - so we allow for a wkt
	 */
	@XmlElement(required = false,name="wkt")
	private String wkt=null;

	/**
	 * invert x and y in wms
	 */
	@XmlElement(name="invert")
	private boolean invert=false;

	/**
	 * always use proj4 translation
	 */
	@XmlElement(name="test")
	private boolean test=false;
	/**
	 * a mapping list for zoom level to layers
	 * each element looks like
	 * <zoomMapping>
	 * 		<zoomlevel>3,4,5,6</zoomlevel>
	 * 		<layers>someLayerName,someOtherLayer</layers>
	 * <zoomMapping>
	 */
	@XmlElementWrapper(name="layerMappings")
	@XmlElements({ @XmlElement(name = "layerMapping", type = LayerMapping.class)})
	private ArrayList<LayerMapping>layermappings=new ArrayList<LayerMapping>();
	
	private HashMap<Integer, String> zoomToLayer=new HashMap<Integer, String>();
	/**
	 * if we do not have EPSG:4326 we should have a proj4 translator here
	 */
	private CoordinateTransform trans=null;

	private double[] translateCoordinate(double x,double y){
		if (trans == null){
			if (! invert) return new double[]{x,y};
			else return new double[]{y,x};
		}
		ProjCoordinate p = new ProjCoordinate();
		ProjCoordinate p2 = new ProjCoordinate();
		p.x = x;
		p.y = y;
		trans.transform(p,p2);
		if (! invert) {
			return new double[]{p2.x, p2.y};
		}
		else{
			return new double[]{p2.y, p2.x};
		}
	}

	protected void afterUnmarshal(Unmarshaller u, Object parent) {
		for(LayerMapping z: layermappings){
			String levels[]=z.zoom.split(" *, *");
			for (String l: levels){
				try {
					int lvl=Integer.parseInt(l);
					zoomToLayer.put(new Integer(lvl), z.layers);
				}catch (NumberFormatException e){}
			}
		}
		if (!DEFAULT_CRS.equals(coordinatesystem) || test){
			log.info(name+": creating coordinate transform between "+DEFAULT_CRS+" and "+coordinatesystem);
			CoordinateTransformFactory ctFactory=new CoordinateTransformFactory();
			CRSFactory csFactory = new CRSFactory();
			CoordinateReferenceSystem src=csFactory.createFromName(DEFAULT_CRS);
			CoordinateReferenceSystem dst=null;
			if (wkt != null){
				log.info(name+": using wkt "+wkt);
				dst=csFactory.createFromParameters(coordinatesystem,wkt);
			}
			else{
				dst=csFactory.createFromName(coordinatesystem);
			}
			trans=ctFactory.createTransform(src,dst);
		}
		super.afterUnmarshal(u, parent);
		
	}

	@Override
	public String getTileUrl(int zoom, int tilex, int tiley) {
		double[] coords = MapSourceTools.calculateLatLon(this, zoom, tilex, tiley);
		double[] min=translateCoordinate(coords[0],coords[1]);
		double[] max=translateCoordinate(coords[2],coords[3]);
		String clayers=layers;
		String zlayers=zoomToLayer.get(new Integer(zoom));
		if (zlayers != null){
			clayers=zlayers;
		}
		String url = this.url + "REQUEST=GetMap" + "&LAYERS=" + clayers + "&SRS=" + coordinatesystem + "&VERSION="
				+ version + "&FORMAT=image/" + tileType.getMimeType() + "&BBOX=" + min[0] + "," + min[1] + ","
				+ max[0] + "," + max[1] + "&WIDTH=256&HEIGHT=256" + aditionalparameters;
		return url;
	}

	public String getVersion() {
		return version;
	}

	public String getLayers() {
		return layers;
	}

	public String getCoordinatesystem() {
		return coordinatesystem;
	}


	

}
